from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view

from .models import Booking
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

    bookings = Booking.objects.filter(organization=org).order_by("-created_at", "-id")
    if status is not None:
        bookings = bookings.filter(status=status)
    total = bookings.count()
    start = (page - 1) * page_size
    items = [
        {
            "id": booking.id,
            "service_id": booking.service_id,
            "status": booking.status,
            "scheduled_at": booking.scheduled_at,
        }
        for booking in bookings[start:start + page_size]
    ]
    return ok({"items": items, "total": total, "page": page, "page_size": page_size})


@api_view(["GET"])
def org_booking_detail(request, booking_id):
    org, failed = _org(request, approved=True)
    if failed is not None:
        return failed
    booking = _owned_booking(org, booking_id)
    if booking is None:
        return error("Booking not found.", 404)

    return ok({
        "id": booking.id,
        "organization_id": booking.organization_id,
        "customer_id": booking.customer_id,
        "service_id": booking.service_id,
        "companion_id": booking.companion_id,
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