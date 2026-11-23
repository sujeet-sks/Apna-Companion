# Admin review of organization registrations
import logging
import uuid

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q
from rest_framework.decorators import api_view

from .admin_auth import admin_from_bearer
from .models import Organization
from .role_auth import error, issue_resubmission_token, ok


logger = logging.getLogger(__name__)
STATUSES = {"all", "pending", "approved", "rejected"}
NON_DELIVERY_BACKENDS = {
    "django.core.mail.backends.console.EmailBackend",
    "django.core.mail.backends.locmem.EmailBackend",
    "django.core.mail.backends.dummy.EmailBackend",
}


class EmailDeliveryError(Exception):
    """The decision email was not accepted by a delivery provider."""


def _public_organization(org):
    return {
        "organizationId": org.organization_id,
        "organizationName": org.organization_name,
        "organizationType": org.organization_type,
        "submitted": org.created_at.date().isoformat(),
        "status": org.approval_status,
        "email": org.email,
        "address": org.address,
        "latitude": float(org.latitude) if org.latitude is not None else None,
        "longitude": float(org.longitude) if org.longitude is not None else None,
        "documentType": org.document_type,
        "documentUrl": org.document_url,
        "approvalRemarks": org.approval_remarks,
    }


def _list_organizations(request, default_status, response_key):
    if admin_from_bearer(request) is None:
        return error("Missing, expired or invalid admin token.", 401)

    if not isinstance(request.data, dict):
        return error("Send a JSON object.")
    status = request.data.get("status", default_status)
    search = request.data.get("search", "")
    if not isinstance(status, str) or status not in STATUSES:
        return error("status must be all, pending, approved or rejected.")
    if not isinstance(search, str) or len(search.strip()) > 150:
        return error("search must be text of at most 150 characters.")

    organizations = Organization.objects.all()
    if status != "all":
        organizations = organizations.filter(approval_status=status)
    if search.strip():
        term = search.strip()
        organizations = organizations.filter(
            Q(organization_name__icontains=term)
            | Q(email__icontains=term)
            | Q(address__icontains=term)
        )
    organizations = organizations.order_by("-created_at", "organization_id")
    return ok({response_key: [_public_organization(org) for org in organizations]})


def _send_decision_email(org, decision, note):
    if settings.EMAIL_BACKEND in NON_DELIVERY_BACKENDS:
        raise EmailDeliveryError("Configure a real email backend.")

    if decision == "approved":
        subject = "Your Apna Companion organization registration is approved"
        body = (
            f"Hello {org.organization_name},\n\n"
            "Your organization registration has been approved. "
            "You can now sign in to the organization portal."
        )
        if note:
            body += f"\n\nReview note: {note}"
    else:
        token = issue_resubmission_token(org)
        subject = "Your Apna Companion organization registration needs changes"
        body = (
            f"Hello {org.organization_name},\n\n"
            f"Your registration was rejected. Reason: {note}\n\n"
            "Sign in to the organization portal, open Resubmit details, "
            "and enter your corrected address and document details.\n\n"
            "Paste this resubmission token into the form "
            f"(valid for 7 days):\n{token}\n"
        )

    try:
        sent = send_mail(
            subject,
            body,
            settings.DEFAULT_FROM_EMAIL,
            [org.email],
            fail_silently=False,
        )
    except Exception as exc:
        raise EmailDeliveryError("The email service failed.") from exc
    if sent != 1:
        raise EmailDeliveryError("The email service did not accept the message.")


def _decide(request, decision):
    if admin_from_bearer(request) is None:
        return error("Missing, expired or invalid admin token.", 401)
    if not isinstance(request.data, dict):
        return error("Send a JSON object.")

    raw_id = request.data.get("organizationId")
    if not isinstance(raw_id, str):
        return error("Enter a valid organizationId.")
    try:
        organization_id = str(uuid.UUID(raw_id))
    except ValueError:
        return error("Enter a valid organizationId.")

    field = "note" if decision == "approved" else "reason"
    value = request.data.get(field, "")
    if not isinstance(value, str):
        return error(f"{field} must be text.")
    note = value.strip()
    if len(note) > 2000:
        return error(f"{field} must be at most 2000 characters.")
    if decision == "rejected" and not note:
        return error("reason is required.")

    try:
        with transaction.atomic():
            org = (
                Organization.objects.select_for_update()
                .filter(organization_id=organization_id)
                .first()
            )
            if org is None:
                return error("Organization not found.", 404)
            if not org.is_active:
                return error("Organization is inactive.", 409)
            if org.approval_status != "pending":
                return error("Organization is not pending.", 409)

            org.approval_status = decision
            org.approval_remarks = note or None
            org.save(update_fields=["approval_status", "approval_remarks", "updated_at"])
            _send_decision_email(org, decision, note)
    except EmailDeliveryError as exc:
        cause = type(exc.__cause__).__name__ if exc.__cause__ else type(exc).__name__
        logger.error(
            "Admin %s email failed for organization %s (%s)",
            decision, organization_id, cause,
        )
        return error("Could not send the decision email. No change was saved.", 503)

    message = f"Organization {decision} successfully"
    return ok({
        "message": message,
        "organizationId": organization_id,
        "status": decision,
    })


@api_view(["POST"])
def requests_list(request):
    return _list_organizations(request, "pending", "requests")


@api_view(["POST"])
def organization_list(request):
    return _list_organizations(request, "all", "organizations")


@api_view(["POST"])
def approve(request):
    return _decide(request, "approved")


@api_view(["POST"])
def reject(request):
    return _decide(request, "rejected")