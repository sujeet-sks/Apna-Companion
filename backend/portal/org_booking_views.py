from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view

from .models import Booking, Companion, CompanionService
from .org_views import _org
from .role_auth import error, ok


BOOKING_STATUSES = {
    "pending", "accepted", "rejected", "assigned", "on_the_way",
    "arrived", "in_progress", "completed", "cancelled",
}


def _owned_booking(org, booking_id, lock=False):
    bookings = Booking.objects.filter(id=booking_id, organization=org)
    if lock:
        bookings = bookings.select_for_update()
    return bookings.first()


@api_view(["GET"])
def org_bookings(request):
    org, failed = _org(request, approved=True)
    if failed is not None:
        return failed

    try:
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 10))
    except (TypeError, ValueError):
        return error("page and page_size must be whole numbers.")
    if page < 1 or not 1 <= page_size <= 50:
        return error("page must be positive; page_size must be between 1 and 50.")

    status = request.query_params.get("status")
    if status is not None and status not in BOOKING_STATUSES:
        return error("Invalid booking status filter.")

    bookings = Booking.objects.filter(organization=org).select_related(
        "customer", "service", "companion"
    ).order_by("-created_at", "-id")
    if status is not None:
        bookings = bookings.filter(status=status)
    total = bookings.count()
    start = (page - 1) * page_size
    items = [
        {
            "id": booking.id,
            "service_id": booking.service_id,
            "service_name": booking.service.name,
            "customer_name": booking.customer.full_name,
            "status": booking.status,
            "scheduled_at": booking.scheduled_at,
            "duration": booking.duration,
            "price_inr": str(booking.price_inr),
            "pickup_address": booking.pickup_address,
            "latitude": float(booking.latitude) if booking.latitude is not None else None,
            "longitude": float(booking.longitude) if booking.longitude is not None else None,
            "companion_id": booking.companion_id,
            "companion_name": booking.companion.name if booking.companion else None,
        }
        for booking in bookings[start:start + page_size]
    ]
    return ok({"items": items, "total": total, "page": page, "page_size": page_size})


@api_view(["GET"])
def org_booking_detail(request, booking_id):
    org, failed = _org(request, approved=True)
    if failed is not None:
        return failed
    booking = Booking.objects.filter(
        id=booking_id, organization=org
    ).select_related("customer", "service", "companion").first()
    if booking is None:
        return error("Booking not found.", 404)

    return ok({
        "id": booking.id,
        "organization_id": booking.organization_id,
        "customer_id": booking.customer_id,
        "customer_name": booking.customer.full_name,
        "service_id": booking.service_id,
        "service_name": booking.service.name,
        "companion_id": booking.companion_id,
        "companion_name": booking.companion.name if booking.companion else None,
        "status": booking.status,
        "scheduled_at": booking.scheduled_at,
        "duration": booking.duration,
        "price_inr": str(booking.price_inr),
        "service_notes": booking.service_notes,
        "pickup_address": booking.pickup_address,
        "latitude": float(booking.latitude) if booking.latitude is not None else None,
        "longitude": float(booking.longitude) if booking.longitude is not None else None,
        "rejection_reason": booking.rejection_reason,
        "cancellation_reason": booking.cancellation_reason,
        "cancelled_by": booking.cancelled_by,
        "cancelled_at": booking.cancelled_at,
        "assigned_at": booking.assigned_at,
        "started_at": booking.started_at,
        "completed_at": booking.completed_at,
        "rejected_at": booking.rejected_at,
    })


@api_view(["POST"])
def org_booking_accept(request, booking_id):
    org, failed = _org(request, approved=True)
    if failed is not None:
        return failed
    with transaction.atomic():
        booking = _owned_booking(org, booking_id, lock=True)
        if booking is None:
            return error("Booking not found.", 404)
        if booking.status != "pending":
            return error("Only pending bookings can be accepted.", 422)
        booking.status = "accepted"
        booking.save(update_fields=["status", "updated_at"])
    return ok({"id": booking.id, "status": booking.status})


@api_view(["POST"])
def org_booking_reject(request, booking_id):
    org, failed = _org(request, approved=True)
    if failed is not None:
        return failed
    if not isinstance(request.data, dict) or set(request.data) != {"rejection_reason"}:
        return error("Send a rejection_reason.")
    reason = request.data["rejection_reason"]
    if not isinstance(reason, str) or not reason.strip():
        return error("Enter a rejection reason.")

    with transaction.atomic():
        booking = _owned_booking(org, booking_id, lock=True)
        if booking is None:
            return error("Booking not found.", 404)
        if booking.status != "pending":
            return error("Only pending bookings can be rejected.", 422)
        booking.status = "rejected"
        booking.rejection_reason = reason.strip()
        booking.rejected_at = timezone.now()
        booking.save(update_fields=[
            "status", "rejection_reason", "rejected_at", "updated_at",
        ])
    return ok({
        "id": booking.id,
        "status": booking.status,
        "rejected_at": booking.rejected_at,
    })


def _has_overlap(companion, booking):
    start = booking.scheduled_at
    end = start + timedelta(minutes=booking.duration)
    other_bookings = Booking.objects.filter(
        companion=companion,
        status__in=["assigned", "on_the_way", "arrived", "in_progress"],
        scheduled_at__lt=end,
    ).exclude(id=booking.id)
    return any(
        other.scheduled_at + timedelta(minutes=other.duration) > start
        for other in other_bookings
    )


@api_view(["GET"])
def org_booking_eligible_companions(request, booking_id):
    org, failed = _org(request, approved=True)
    if failed is not None:
        return failed
    booking = _owned_booking(org, booking_id)
    if booking is None:
        return error("Booking not found.", 404)
    if booking.status != "accepted" or booking.companion_id is not None:
        return error("Only an unassigned accepted booking can be assigned.", 422)
    if not booking.service.is_active or booking.service.organization_id != org.pk:
        return error("Booking service is not active for this organization.", 422)

    try:
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 10))
    except (TypeError, ValueError):
        return error("page and page_size must be whole numbers.")
    if page < 1 or not 1 <= page_size <= 50:
        return error("page must be positive; page_size must be between 1 and 50.")

    mapped_ids = CompanionService.objects.filter(
        service_id=booking.service_id
    ).values_list("companion_id", flat=True)
    candidates = Companion.objects.filter(
        organization=org, is_active=True, companion_id__in=mapped_ids
    ).exclude(availability_status="unavailable").order_by("name", "companion_id")
    eligible = [
        {"companion_id": companion.companion_id, "name": companion.name}
        for companion in candidates if not _has_overlap(companion, booking)
    ]
    start = (page - 1) * page_size
    return ok({
        "items": eligible[start:start + page_size],
        "page": page,
        "page_size": page_size,
        "total": len(eligible),
    })


@api_view(["POST"])
def org_booking_assign(request, booking_id):
    org, failed = _org(request, approved=True)
    if failed is not None:
        return failed
    if not isinstance(request.data, dict) or set(request.data) != {"companion_id"}:
        return error("Send companion_id.")
    companion_id = request.data["companion_id"]
    if not isinstance(companion_id, str) or not companion_id.strip():
        return error("Enter a companion ID.")

    with transaction.atomic():
        booking = _owned_booking(org, booking_id, lock=True)
        if booking is None:
            return error("Booking not found.", 404)
        if booking.status != "accepted" or booking.companion_id is not None:
            return error("Only an unassigned accepted booking can be assigned.", 422)
        if not booking.service.is_active or booking.service.organization_id != org.pk:
            return error("Booking service is not active for this organization.", 422)

        companion = Companion.objects.select_for_update().filter(
            companion_id=companion_id.strip(), organization=org
        ).first()
        if (
            companion is None
            or not companion.is_active
            or companion.availability_status == "unavailable"
        ):
            return error("Companion is not available for this booking.", 422)
        has_service = CompanionService.objects.filter(
            companion=companion, service_id=booking.service_id
        ).exists()
        if not has_service or _has_overlap(companion, booking):
            return error("Companion cannot provide this service at that time.", 422)

        booking.companion = companion
        booking.status = "assigned"
        booking.assigned_at = timezone.now()
        booking.save(update_fields=["companion", "status", "assigned_at", "updated_at"])
    return ok({
        "id": booking.id,
        "companion_id": booking.companion_id,
        "status": booking.status,
        "assigned_at": booking.assigned_at,
    })


@api_view(["GET"])
def org_booking_tracking(request, booking_id):
    org, failed = _org(request, approved=True)
    if failed is not None:
        return failed
    booking = _owned_booking(org, booking_id)
    if booking is None:
        return error("Booking not found.", 404)
    return ok({
        "id": booking.id,
        "status": booking.status,
        "assigned_at": booking.assigned_at,
        "started_at": booking.started_at,
        "completed_at": booking.completed_at,
    })


def _currently_busy(companion):
    if Booking.objects.filter(
        companion=companion, status__in=["on_the_way", "arrived", "in_progress"]
    ).exists():
        return True
    now = timezone.now()
    assigned = Booking.objects.filter(
        companion=companion, status="assigned", scheduled_at__lte=now
    )
    return any(
        now < other.scheduled_at + timedelta(minutes=other.duration)
        for other in assigned
    )


@api_view(["POST"])
def org_booking_cancel(request, booking_id):
    org, failed = _org(request, approved=True)
    if failed is not None:
        return failed
    if not isinstance(request.data, dict) or set(request.data) != {"cancellation_reason"}:
        return error("Send a cancellation_reason.")
    reason = request.data["cancellation_reason"]
    if not isinstance(reason, str) or not reason.strip():
        return error("Enter a cancellation reason.")

    with transaction.atomic():
        booking = _owned_booking(org, booking_id, lock=True)
        if booking is None:
            return error("Booking not found.", 404)
        cancellable = {"pending", "accepted", "assigned", "on_the_way", "arrived"}
        if booking.status not in cancellable:
            return error("This booking cannot be cancelled now.", 422)

        companion = None
        if booking.companion_id is not None:
            companion = Companion.objects.select_for_update().filter(
                companion_id=booking.companion_id, organization=org
            ).first()
        booking.status = "cancelled"
        booking.cancelled_by = "organization"
        booking.cancellation_reason = reason.strip()
        booking.cancelled_at = timezone.now()
        booking.save(update_fields=[
            "status", "cancelled_by", "cancellation_reason", "cancelled_at", "updated_at",
        ])

        if companion is not None and companion.availability_status == "busy":
            if not _currently_busy(companion):
                companion.availability_status = "available"
                companion.save(update_fields=["availability_status", "updated_at"])

    return ok({
        "id": booking.id,
        "status": booking.status,
        "cancelled_by": booking.cancelled_by,
        "cancelled_at": booking.cancelled_at,
    })



@api_view(["GET"])
def org_dashboard(request):
    org, failed = _org(request, approved=True)
    if failed is not None:
        return failed

    own_bookings = Booking.objects.filter(organization=org)
    return ok({
        "companions_total": Companion.objects.filter(organization=org).count(),
        "pending_bookings": own_bookings.filter(status="pending").count(),
        "active_bookings": own_bookings.filter(status__in=[
            "assigned", "on_the_way", "arrived", "in_progress",
        ]).count(),
    })