# Customer organization search, bookings, and reviews
import hashlib
import hmac
from datetime import datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db import transaction
from django.db.models import Avg, Count, Prefetch
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .customer_auth import (
    customer_from_bearer, hash_password, normalize_mobile, verify_password,
)
from .models import Booking, Organization, Service


OPEN_STATUSES = (
    "pending", "accepted", "assigned", "on_the_way", "arrived", "in_progress",
)
ORGANIZATION_TYPES = {"bank", "hospital", "ngo", "rto", "others"}
INDIA_TIME = ZoneInfo("Asia/Kolkata")


def _error(message, status=400):
    return Response({"detail": message}, status=status)


def _customer(request):
    customer = customer_from_bearer(request)
    if customer is None:
        return None, _error("Missing or expired customer token.", 401)
    return customer, None


def _booking_code(booking_id, kind):
    """Derive the same six-digit code without storing it in plain text."""
    message = f"booking-otp-v1:{booking_id}:{kind}".encode("utf-8")
    digest = hmac.new(settings.SECRET_KEY.encode("utf-8"), message, hashlib.sha256).digest()
    code = int.from_bytes(digest[:8], "big") % 1_000_000
    if kind == "end" and code == int(_booking_code(booking_id, "start")):
        code = (code + 1) % 1_000_000
    return f"{code:06d}"


def _unused_code(booking, kind):
    stored_hash = getattr(booking, f"{kind}_code_hash")
    if not stored_hash:
        return None
    code = _booking_code(booking.id, kind)
    return code if verify_password(code, stored_hash) else None


def _rating(value):
    if value is None:
        return None
    return float(Decimal(str(value)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))


def _organization_stats(organization_ids):
    rows = (
        Booking.objects.filter(status="completed", organization_id__in=organization_ids)
        .values("organization_id")
        .annotate(
            completed_bookings=Count("id"),
            total_reviews=Count("customer_rating"),
            average_rating=Avg("customer_rating"),
        )
    )
    return {row["organization_id"]: row for row in rows}


def _companion_stats(companion_ids):
    rows = (
        Booking.objects.filter(status="completed", companion_id__in=companion_ids)
        .values("companion_id")
        .annotate(
            total_reviews=Count("companion_rating"),
            average_rating=Avg("companion_rating"),
        )
    )
    return {row["companion_id"]: row for row in rows}


def _companion_data(companion, stats, *, history=False):
    if companion is None:
        return None
    row = stats.get(companion.companion_id)
    result = {
        "name": companion.name,
        "rating": _rating(row["average_rating"]) if row else None,
    }
    if history:
        result["phone"] = companion.mobile
    else:
        mobile = companion.mobile
        result["photo_url"] = companion.photo_url
        result["phone_masked"] = f"{mobile[:3]} {mobile[3:5]}xxxxxx{mobile[-2:]}"
    return result


def _scheduled_at(value):
    return timezone.localtime(value, INDIA_TIME).isoformat()


def _booking_item(booking, organization_stats, companion_stats, *, current):
    org = organization_stats.get(booking.organization_id)
    item = {
        "bookingId": booking.id,
        "status": booking.status,
        "organizationname": booking.organization.organization_name,
        "rating": _rating(org["average_rating"]) if org else None,
        "companion": _companion_data(booking.companion, companion_stats, history=not current),
        "scheduletimestamp": _scheduled_at(booking.scheduled_at),
        "durationOfBooking": booking.duration,
        "contactName": booking.pickup_contact_name,
        "contactPhone": booking.pickup_contact_phone,
    }
    if current:
        item["serviceName"] = booking.service.name
        item["startOtp"] = _unused_code(booking, "start")
        item["endOtp"] = _unused_code(booking, "end")
    else:
        item["service"] = booking.service.name
        item["organizationRating"] = booking.customer_rating
        item["companionRating"] = booking.companion_rating
        item["comments"] = booking.customer_comment
    return item


def _bookings_response(request, *, current):
    customer, failed = _customer(request)
    if failed is not None:
        return failed
    statuses = OPEN_STATUSES if current else ("completed",)
    bookings = list(
        Booking.objects.filter(customer=customer, status__in=statuses)
        .select_related("service", "organization", "companion")
        .order_by("-scheduled_at", "-id")
    )
    org_stats = _organization_stats({booking.organization_id for booking in bookings})
    comp_stats = _companion_stats({
        booking.companion_id for booking in bookings if booking.companion_id
    })
    return Response({
        "success": 200,
        "data": [
            _booking_item(booking, org_stats, comp_stats, current=current)
            for booking in bookings
        ],
    })


@api_view(["POST"])
def get_organization_details(request):
    _, failed = _customer(request)
    if failed is not None:
        return failed
    if not isinstance(request.data, dict):
        return _error("Send a JSON object.")
    purpose = str(request.data.get("purpose") or "").strip().lower()
    if purpose not in ORGANIZATION_TYPES:
        return _error("Choose bank, hospital, ngo, rto, or others for purpose.")

    organizations = list(
        Organization.objects.filter(
            organization_type=purpose, approval_status="approved", is_active=True,
        )
        .prefetch_related(Prefetch(
            "service_set",
            queryset=Service.objects.filter(is_active=True).order_by("id"),
            to_attr="active_services",
        ))
        .order_by("organization_name", "organization_id")
    )
    organizations = [org for org in organizations if org.active_services]
    stats = _organization_stats({org.organization_id for org in organizations})
    items = []
    for org in organizations:
        row = stats.get(org.organization_id)
        items.append({
            "organizationId": org.organization_id,
            "name": org.organization_name,
            "organizationType": org.organization_type,
            "logoUrl": org.logo_url,
            "rating": _rating(row["average_rating"]) if row else None,
            "totalReviews": row["total_reviews"] if row else 0,
            "completedBookings": row["completed_bookings"] if row else 0,
            "service": [
                {
                    "serviceId": service.id,
                    "serviceName": service.name,
                    "serviceDescription": service.description,
                    "servicePrice": str(service.price_inr),
                }
                for service in org.active_services
            ],
        })
    return Response({
        "success": 200,
        "message": "Organizations fetched successfully",
        "data": {"organizations": items},
    })


def _coordinate(value, limit):
    try:
        coordinate = Decimal(str(value))
        if not coordinate.is_finite() or not -limit <= coordinate <= limit:
            raise ValueError
        return coordinate.quantize(Decimal("0.000001"))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError("Enter valid pickup coordinates.") from exc


@api_view(["POST"])
def request_booking(request):
    customer, failed = _customer(request)
    if failed is not None:
        return failed
    if not isinstance(request.data, dict):
        return _error("Send a JSON object.")

    data = request.data
    organization_id = data.get("organizationId")
    service_id = data.get("serviceId")
    duration = data.get("durationOfBooking")
    contact_name = data.get("contactName")
    pickup_address = data.get("address")
    if not isinstance(organization_id, str) or not organization_id.strip():
        return _error("Select an organization.")
    if type(service_id) is not int or service_id <= 0:
        return _error("Select a service ID.")
    if type(duration) is not int or duration <= 0:
        return _error("durationOfBooking must be positive minutes.")
    if not isinstance(contact_name, str) or not 1 <= len(contact_name.strip()) <= 100:
        return _error("Enter a contact name of at most 100 characters.")
    if not isinstance(pickup_address, str) or not pickup_address.strip():
        return _error("Enter a pickup address.")

    try:
        contact_phone = normalize_mobile(data.get("contactPhone"))
        latitude = _coordinate(data.get("latitude"), 90)
        longitude = _coordinate(data.get("longitude"), 180)
        scheduled_at = datetime.fromisoformat(str(data.get("scheduletimestamp") or ""))
        if timezone.is_naive(scheduled_at) or scheduled_at <= timezone.now():
            raise ValueError("Choose a future schedule with a timezone offset.")
    except (ValueError, TypeError) as exc:
        return _error(str(exc))

    service = Service.objects.select_related("organization").filter(
        id=service_id,
        organization_id=organization_id.strip(),
        organization__approval_status="approved",
        organization__is_active=True,
        is_active=True,
    ).first()
    if service is None:
        return _error("This organization does not offer the selected active service.", 422)

    with transaction.atomic():
        booking = Booking.objects.create(
            customer=customer,
            organization=service.organization,
            service=service,
            scheduled_at=scheduled_at,
            duration=duration,
            price_inr=service.price_inr,
            pickup_address=pickup_address.strip(),
            latitude=latitude,
            longitude=longitude,
            pickup_contact_name=contact_name.strip(),
            pickup_contact_phone=contact_phone,
            status="pending",
        )
        booking.start_code_hash = hash_password(_booking_code(booking.id, "start"))
        booking.end_code_hash = hash_password(_booking_code(booking.id, "end"))
        booking.save(update_fields=["start_code_hash", "end_code_hash", "updated_at"])

    return Response({
        "success": 200,
        "data": {"message": "booking pending", "bookingId": booking.id, "status": booking.status},
    })


@api_view(["POST"])
def get_all_booking_details(request):
    return _bookings_response(request, current=False)


@api_view(["POST"])
def get_current_booking_details(request):
    return _bookings_response(request, current=True)


@api_view(["POST"])
def submit_review(request):
    customer, failed = _customer(request)
    if failed is not None:
        return failed
    if not isinstance(request.data, dict):
        return _error("Send a JSON object.")

    data = request.data
    booking_id = data.get("bookingId")
    organization_rating = data.get("organizationRating")
    companion_rating = data.get("companionRating")
    comment = data.get("Comment")
    if type(booking_id) is not int or booking_id <= 0:
        return _error("Enter a valid bookingId.")
    if type(organization_rating) is not int or not 1 <= organization_rating <= 5:
        return _error("organizationRating must be an integer from 1 to 5.")
    if companion_rating is not None and (
        type(companion_rating) is not int or not 1 <= companion_rating <= 5
    ):
        return _error("companionRating must be an integer from 1 to 5.")
    if comment is not None and (not isinstance(comment, str) or len(comment.strip()) > 1000):
        return _error("Comment must be at most 1000 characters.")

    with transaction.atomic():
        booking = Booking.objects.select_for_update().filter(
            id=booking_id, customer=customer,
        ).first()
        if booking is None:
            return _error("Booking not found.", 404)
        if booking.status != "completed":
            return _error("Only completed bookings can be reviewed.", 422)
        if booking.reviewed_at is not None or booking.customer_rating is not None:
            return _error("This booking has already been reviewed.", 409)
        if booking.companion_id and companion_rating is None:
            return _error("Enter a companionRating for the assigned companion.")
        if not booking.companion_id and companion_rating is not None:
            return _error("This booking has no assigned companion to rate.")

        booking.customer_rating = organization_rating
        booking.companion_rating = companion_rating
        booking.customer_comment = (comment.strip() or None) if comment is not None else None
        booking.reviewed_at = timezone.now()
        booking.save(update_fields=[
            "customer_rating", "companion_rating", "customer_comment", "reviewed_at", "updated_at",
        ])

    return Response({
        "success": 200,
        "data": {"message": "review submitted successfully"},
    })