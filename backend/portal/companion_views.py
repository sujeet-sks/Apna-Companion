# Companion authentication APIs
from rest_framework.decorators import api_view

from .role_auth import (
    change_password, error, from_bearer, login_account, ok,
    reset_complete, reset_request,
)


def _companion(request):
    companion = from_bearer(request, "companion")
    if companion is None:
        return None, error("Missing, expired or invalid companion token.", 401)
    return companion, None


@api_view(["POST"])
def companion_login(request):
    return login_account("companion", request.data.get("email"), request.data.get("password"))


@api_view(["POST"])
def companion_forgot_request(request):
    return reset_request("companion", request.data.get("email"))


@api_view(["POST"])
def companion_forgot_complete(request):
    return reset_complete("companion", request.data)


@api_view(["GET"])
def companion_me(request):
    companion, failed = _companion(request)
    if failed is not None:
        return failed
    return ok({
        "role": "companion", "companion_id": companion.companion_id,
        "organization_id": companion.organization_id, "email": companion.email,
    })


@api_view(["PATCH"])
def companion_change_password(request):
    companion, failed = _companion(request)
    if failed is not None:
        return failed
    return change_password(companion, request.data)


@api_view(["POST"])
def companion_logout(request):
    _, failed = _companion(request)
    if failed is not None:
        return failed
    return ok({"message": "Logged out"})


@api_view(["GET"])
def companion_profile(request):
    companion, failed = _companion(request)
    if failed is not None:
        return failed

    organization = companion.organization
    return ok({
        "companion_id": companion.companion_id,
        "name": companion.name,
        "email": companion.email,
        "mobile": companion.mobile,
        "dob": companion.dob,
        "gender": companion.gender,
        "address": companion.address,
        "photo_url": companion.photo_url,
        "speciality": companion.speciality,
        "experience_years": (
            float(companion.experience_years)
            if companion.experience_years is not None else None
        ),
        "languages_known": companion.languages_known,
        "is_active": companion.is_active,
        "availability_status": companion.availability_status,
        "organization": {
            "organization_id": organization.organization_id,
            "organization_name": organization.organization_name,
            "email": organization.email,
            "address": organization.address,
            "logo_url": organization.logo_url,
        },
    })