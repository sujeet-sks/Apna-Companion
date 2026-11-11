import re

from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view

from .companion_views import _companion
from .customer_auth import verify_password
from .models import Booking, Companion
from .org_booking_views import _currently_busy
from .role_auth import error, ok


ACTIVE_STATUSES = ["assigned", "on_the_way", "arrived", "in_progress"]
PAST_STATUSES = ["completed", "cancelled"]


def _page(request):
    try:
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 10))
    except (TypeError, ValueError):
        return None, error("page and page_size must be whole numbers.")
    if page < 1 or not 1 <= page_size <= 50:
        return None, error("page must be positive; page_size must be between 1 and 50.")
    return (page, page_size), None


@api_view(["GET"])
def companion_dashboard(request):
    companion, failed = _companion(request)
    if failed is not None:
        return failed

    own_bookings = Booking.objects.filter(companion=companion)
    return ok({
        "active_count": own_bookings.filter(status__in=ACTIVE_STATUSES).count(),
        "past_count": own_bookings.filter(status__in=PAST_STATUSES).count(),
    })


@api_view(["GET"])
def companion_active_bookings(request):
    companion, failed = _companion(request)
    if failed is not None:
        return failed
    pagination, failed = _page(request)
    if failed is not None:
        return failed
    page, page_size = pagination

    bookings = Booking.objects.filter(
        companion=companion, status__in=ACTIVE_STATUSES
    ).select_related("service").order_by("scheduled_at", "id")
    start = (page - 1) * page_size
    items = [
        {
            "id": booking.id,
            "service_name": booking.service.name,
            "status": booking.status,
            "scheduled_at": booking.scheduled_at,
        }
        for booking in bookings[start:start + page_size]
    ]
    return ok({
        "items": items, "total": bookings.count(),
        "page": page, "page_size": page_size,
    })


@api_view(["GET"])
def companion_booking_history(request):
    companion, failed = _companion(request)
    if failed is not None:
        return failed
    pagination, failed = _page(request)
    if failed is not None:
        return failed
    page, page_size = pagination

    bookings = Booking.objects.filter(
        companion=companion, status__in=PAST_STATUSES
    ).select_related("service").order_by("-scheduled_at", "-id")
    start = (page - 1) * page_size
    items = [
        {
            "id": booking.id,
            "service_name": booking.service.name,
            "status": booking.status,
            "scheduled_at": booking.scheduled_at,
            "assigned_at": booking.assigned_at,
            "completed_at": booking.completed_at,
            "cancelled_at": booking.cancelled_at,
            "cancelled_by": booking.cancelled_by,
            "cancellation_reason": booking.cancellation_reason,
        }
        for booking in bookings[start:start + page_size]
    ]
    return ok({
        "items": items, "total": bookings.count(),
        "page": page, "page_size": page_size,
    })


@api_view(["GET"])
def companion_booking_detail(request, booking_id):
    companion, failed = _companion(request)
    if failed is not None:
        return failed
    booking = Booking.objects.filter(
        id=booking_id, companion=companion
    ).select_related("customer", "service").first()
    if booking is None:
        return error("Booking not found.", 404)

    return ok({
        "id": booking.id,
        "organization_id": booking.organization_id,
        "customer_name": booking.customer.full_name,
        "service_id": booking.service_id,
        "service_name": booking.service.name,
        "status": booking.status,
        "scheduled_at": booking.scheduled_at,
        "duration": booking.duration,
        "price_inr": str(booking.price_inr),
        "service_notes": booking.service_notes,
        "pickup_address": booking.pickup_address,
        "latitude": float(booking.latitude) if booking.latitude is not None else None,
        "longitude": float(booking.longitude) if booking.longitude is not None else None,
        "cancellation_reason": booking.cancellation_reason,
        "cancelled_at": booking.cancelled_at,
        "started_at": booking.started_at,
        "completed_at": booking.completed_at,
        "assigned_at": booking.assigned_at,
        "cancelled_by": booking.cancelled_by,
    })


@api_view(["PATCH"])
def companion_booking_status(request, booking_id):
    companion, failed = _companion(request)
    if failed is not None:
        return failed
    if not isinstance(request.data, dict) or set(request.data) != {"status"}:
        return error("Send status as on_the_way or arrived.")
    new_status = request.data["status"]
    previous = {"on_the_way": "assigned", "arrived": "on_the_way"}
    if not isinstance(new_status, str) or new_status not in previous:
        return error("Only on_the_way and arrived are allowed.", 422)

    with transaction.atomic():
        booking = Booking.objects.select_for_update().filter(
            id=booking_id, companion=companion
        ).first()
        if booking is None:
            return error("Booking not found.", 404)
        if booking.status != previous[new_status]:
            return error("Booking is not at the required previous status.", 422)

        locked_companion = Companion.objects.select_for_update().get(pk=companion.pk)
        if locked_companion.availability_status == "unavailable":
            return error("Companion is unavailable.", 422)
        if new_status == "on_the_way" and Booking.objects.filter(
            companion=locked_companion,
            status__in=["on_the_way", "arrived", "in_progress"],
        ).exclude(id=booking.id).exists():
            return error("Finish the other journey before starting this one.", 422)

        if locked_companion.availability_status != "busy":
            locked_companion.availability_status = "busy"
            locked_companion.save(update_fields=["availability_status", "updated_at"])
        booking.status = new_status
        booking.save(update_fields=["status", "updated_at"])

    return ok({"id": booking.id, "status": booking.status})


def _six_digit_code(data, field):
    if not isinstance(data, dict) or set(data) != {field}:
        return None, error(f"Send {field}.")
    code = data[field]
    if not isinstance(code, str) or re.fullmatch(r"[0-9]{6}", code) is None:
        return None, error(f"{field} must be a six-digit string.")
    return code, None


@api_view(["POST"])
def companion_booking_start(request, booking_id):
    companion, failed = _companion(request)
    if failed is not None:
        return failed
    code, failed = _six_digit_code(request.data, "start_code")
    if failed is not None:
        return failed

    with transaction.atomic():
        booking = Booking.objects.select_for_update().filter(
            id=booking_id, companion=companion
        ).first()
        if booking is None:
            return error("Booking not found.", 404)
        if booking.status != "arrived":
            return error("Only an arrived booking can be started.", 422)
        if not booking.start_code_hash:
            return error("Start code is not available for this booking.", 422)
        if not verify_password(code, booking.start_code_hash):
            return error("Incorrect start code.")

        booking.status = "in_progress"
        booking.started_at = timezone.now()
        booking.start_code_hash = None
        booking.save(update_fields=[
            "status", "started_at", "start_code_hash", "updated_at",
        ])

    return ok({
        "id": booking.id,
        "status": booking.status,
        "started_at": booking.started_at,
    })


@api_view(["POST"])
def companion_booking_complete(request, booking_id):
    companion, failed = _companion(request)
    if failed is not None:
        return failed
    code, failed = _six_digit_code(request.data, "end_code")
    if failed is not None:
        return failed

    with transaction.atomic():
        booking = Booking.objects.select_for_update().filter(
            id=booking_id, companion=companion
        ).first()
        if booking is None:
            return error("Booking not found.", 404)
        if booking.status != "in_progress":
            return error("Only an in-progress booking can be completed.", 422)
        if not booking.end_code_hash:
            return error("End code is not available for this booking.", 422)
        if not verify_password(code, booking.end_code_hash):
            return error("Incorrect end code.")

        locked_companion = Companion.objects.select_for_update().get(pk=companion.pk)
        booking.status = "completed"
        booking.completed_at = timezone.now()
        booking.end_code_hash = None
        booking.save(update_fields=[
            "status", "completed_at", "end_code_hash", "updated_at",
        ])

        if locked_companion.availability_status == "busy":
            if not _currently_busy(locked_companion):
                locked_companion.availability_status = "available"
                locked_companion.save(update_fields=["availability_status", "updated_at"])

    return ok({
        "id": booking.id,
        "status": booking.status,
        "completed_at": booking.completed_at,
    })