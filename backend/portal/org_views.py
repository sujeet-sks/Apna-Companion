# Organization registration/authentication and the first companion/service APIs
from datetime import date
from decimal import Decimal, InvalidOperation
import logging
import secrets
import uuid

from django.conf import settings
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.decorators import api_view

from .customer_auth import hash_password, normalize_email, normalize_mobile, validate_new_password
from .models import Companion, CompanionService, Organization, Service
from .role_auth import (
    change_password, consume_email_code, error, from_bearer,
    login_account, ok, organization_for_resubmission, reset_complete,
    reset_request, start_email_code, verify_email_code,
)


logger = logging.getLogger(__name__)
ORG_TYPES = {"bank", "hospital", "ngo", "rto", "others"}


def _org(request, approved=False):
    org = from_bearer(request, "organization")
    if org is None:
        return None, error("Missing, expired or invalid organization token.", 401)
    if approved and org.approval_status != "approved":
        return None, error("Organization approval is required.", 403)
    return org, None


@api_view(["POST"])
def org_register_start(request):
    try:
        name = str(request.data.get("organization_name") or "").strip()
        org_type = str(request.data.get("organization_type") or "").strip().lower()
        email = normalize_email(request.data.get("email"))
        address = str(request.data.get("address") or "").strip()
        document_type = str(request.data.get("document_type") or "").strip()
        document_url = str(request.data.get("document_url") or "").strip()
        validate_new_password(request.data.get("password"), request.data.get("confirm_password"))
        if not 1 <= len(name) <= 150 or org_type not in ORG_TYPES:
            raise ValueError("Enter an organization name and valid organization type.")
        if not address or not document_type or not document_url:
            raise ValueError("Address, document type and document URL are required.")
    except ValueError as exc:
        return error(str(exc))
    if Organization.objects.filter(email__iexact=email).exists():
        return error("Email is already registered.", 409)

    request_id, failed = start_email_code(
        "organization", "register", email,
        {
            "organization_name": name, "organization_type": org_type,
            "address": address, "document_type": document_type,
            "document_url": document_url,
            "password_hash": hash_password(request.data["password"]),
        },
        "organization registration",
    )
    if failed is not None:
        return failed
    return ok({"verification_id": request_id, "expires_in": 600})


@api_view(["POST"])
def org_register_complete(request):
    request_id = str(request.data.get("verification_id") or "")
    state, failed = verify_email_code(
        "organization", "register", request_id, request.data.get("email_code")
    )
    if failed is not None:
        return failed
    try:
        with transaction.atomic():
            org = Organization.objects.create(
                organization_id=str(uuid.uuid4()),
                organization_name=state["organization_name"],
                organization_type=state["organization_type"],
                email=state["email"], address=state["address"],
                document_type=state["document_type"], document_url=state["document_url"],
                password_hash=state["password_hash"],
                approval_status="pending", is_active=True,
            )
    except IntegrityError:
        consume_email_code("organization", "register", request_id)
        return error("Email is already registered.", 409)
    consume_email_code("organization", "register", request_id)
    return ok({
        "message": "Organization registration submitted for approval.",
        "organization": {"organization_id": org.organization_id, "approval_status": "pending"},
    }, 201)


@api_view(["POST"])
def org_login(request):
    return login_account("organization", request.data.get("email"), request.data.get("password"))


@api_view(["POST"])
def org_forgot_request(request):
    return reset_request("organization", request.data.get("email"))


@api_view(["POST"])
def org_forgot_complete(request):
    return reset_complete("organization", request.data)


@api_view(["GET"])
def org_me(request):
    org, failed = _org(request)
    if failed is not None:
        return failed
    return ok({
        "role": "organization", "organization_id": org.organization_id,
        "email": org.email, "approval_status": org.approval_status,
    })


@api_view(["GET"])
def org_profile(request):
    org, failed = _org(request)
    if failed is not None:
        return failed
    return ok({
        "organization_id": org.organization_id, "organization_name": org.organization_name,
        "organization_type": org.organization_type, "email": org.email,
        "address": org.address, "logo_url": org.logo_url,
        "latitude": float(org.latitude) if org.latitude is not None else None,
        "longitude": float(org.longitude) if org.longitude is not None else None,
        "document_type": org.document_type, "approval_status": org.approval_status,
        "approval_remarks": org.approval_remarks, "is_active": org.is_active,
    })


@api_view(["PATCH"])
def org_change_password(request):
    org, failed = _org(request)
    if failed is not None:
        return failed
    return change_password(org, request.data)


@api_view(["POST"])
def org_logout(request):
    _, failed = _org(request)
    if failed is not None:
        return failed
    return ok({"message": "Logged out"})


@api_view(["POST"])
def org_resubmit(request):
    token = str(request.data.get("resubmission_token") or "")
    org = organization_for_resubmission(token)
    if org is None:
        return error("Invalid or expired resubmission link.", 403)
    address = str(request.data.get("address") or "").strip()
    document_type = str(request.data.get("document_type") or "").strip()
    document_url = str(request.data.get("document_url") or "").strip()
    if not address or not document_type or not document_url:
        return error("Address, document type and document URL are required.")
    with transaction.atomic():
        updated = Organization.objects.filter(
            pk=org.pk, approval_status="rejected", is_active=True
        ).update(
            address=address, document_type=document_type, document_url=document_url,
            approval_status="pending", approval_remarks=None,
            updated_at=timezone.now(),
        )
    if not updated:
        return error("Organization has already been resubmitted.", 409)
    return ok({
        "organization_id": org.organization_id,
        "approval_status": "pending", "message": "Resubmitted for review",
    })


@api_view(["POST"])
def org_services(request):
    # A small service-create endpoint: create IDs for companion.service_ids
    org, failed = _org(request, approved=True)
    if failed is not None:
        return failed
    name = str(request.data.get("name") or "").strip()
    if not 1 <= len(name) <= 120:
        return error("Enter a service name of at most 120 characters.")
    try:
        price = Decimal(str(request.data.get("price_inr")))
        if not price.is_finite() or price < 0 or price > Decimal("99999999.99") or price.as_tuple().exponent < -2:
            raise ValueError
    except (InvalidOperation, TypeError, ValueError):
        return error("Enter a nonnegative price with at most two decimal places.")
    service = Service.objects.create(
        organization=org, name=name,
        description=str(request.data.get("description") or "").strip() or None,
        price_inr=price,
    )
    return ok({"id": service.id, "is_active": True}, 201)


def _companion_input(data):
    name = str(data.get("name") or "").strip()
    email = normalize_email(data.get("email"))
    mobile = normalize_mobile(data.get("mobile"))
    ids = data.get("service_ids")
    if not 1 <= len(name) <= 100:
        raise ValueError("Enter a companion name of at most 100 characters.")
    if not isinstance(ids, list) or any(type(x) is not int or x < 1 for x in ids) or len(ids) != len(set(ids)):
        raise ValueError("service_ids must be a list of distinct positive service IDs.")
    raw_dob = data.get("dob")
    dob = date.fromisoformat(str(raw_dob)) if raw_dob else None
    if dob and dob > date.today():
        raise ValueError("Date of birth cannot be in the future.")
    gender = str(data.get("gender") or "").strip() or None
    speciality = str(data.get("speciality") or "").strip() or None
    if (gender and len(gender) > 20) or (speciality and len(speciality) > 100):
        raise ValueError("Gender or speciality is too long.")
    languages = data.get("languages_known", [])
    if not isinstance(languages, list) or any(not isinstance(v, str) for v in languages):
        raise ValueError("languages_known must be a list of strings.")
    raw_exp = data.get("experience_years")
    experience = None
    if raw_exp not in (None, ""):
        try:
            experience = Decimal(str(raw_exp))
            if not experience.is_finite() or experience < 0 or experience > Decimal("999.9") or experience.as_tuple().exponent < -1:
                raise ValueError
        except (InvalidOperation, ValueError):
            raise ValueError("Experience must be between 0 and 999.9 years, to one decimal.")
    return {
        "name": name, "email": email, "mobile": mobile, "service_ids": ids,
        "dob": dob, "gender": gender,
        "address": str(data.get("address") or "").strip() or None,
        "identity_proof_url": str(data.get("identity_proof_url") or "").strip() or None,
        "photo_url": str(data.get("photo_url") or "").strip() or None,
        "speciality": speciality, "experience_years": experience,
        "languages_known": languages,
    }


@api_view(["POST"])
def org_companions(request):
    org, failed = _org(request, approved=True)
    if failed is not None:
        return failed
    try:
        values = _companion_input(request.data)
    except (ValueError, TypeError) as exc:
        return error(str(exc))
    if Companion.objects.filter(email__iexact=values["email"]).exists():
        return error("Companion email is already registered.", 409)
    ids = values.pop("service_ids")
    if Service.objects.filter(organization=org, id__in=ids).count() != len(ids):
        return error("Every service ID must belong to this organization.")

    temporary_password = secrets.token_urlsafe(12)
    try:
        with transaction.atomic():
            companion = Companion.objects.create(
                companion_id=str(uuid.uuid4()), organization=org,
                password_hash=hash_password(temporary_password), **values,
            )
            CompanionService.objects.bulk_create([
                CompanionService(companion=companion, service_id=service_id)
                for service_id in ids
            ])
            sent = send_mail(
                "Your Apna Companion account",
                "An organization has created your companion account.\n"
                f"Email: {companion.email}\nTemporary password: {temporary_password}\n"
                "Please log in and change your password.",
                settings.DEFAULT_FROM_EMAIL, [companion.email], fail_silently=False,
            )
            if sent != 1:
                raise RuntimeError("Mail service did not accept the message.")
    except IntegrityError:
        return error("Companion email is already registered or a service has changed.", 409)
    except Exception:
        logger.exception("Companion creation or temporary password email failed")
        return error("Could not create companion or send email. Try again later.", 503)
    return ok({
        "companion_id": companion.companion_id, "email": companion.email,
        "is_active": companion.is_active,
        "availability_status": companion.availability_status,
        "message": "Companion created; temporary password emailed",
    }, 201)