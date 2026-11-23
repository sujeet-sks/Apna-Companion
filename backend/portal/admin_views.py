# Admin login, email password reset, and logout
import hmac
import logging
import re
import secrets
import time

from django.core.cache import cache
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .admin_auth import (
    CODE_TTL_SECONDS, RESEND_AFTER_SECONDS, admin_from_bearer,
    issue_access_token, reset_key, send_reset_code, throttle_key,
)
from .customer_auth import (
    ACCESS_TOKEN_SECONDS, MAX_CODE_ATTEMPTS, code_digest, hash_password,
    new_code, normalize_email, validate_new_password, verify_password,
)
from .models import Admin


logger = logging.getLogger(__name__)


def _error(message, code=400):
    return Response({"detail": message}, status=code)


def _public_admin(admin):
    return {
        "admin_id": str(admin.id),
        "full_name": admin.full_name,
        "email": admin.email,
        "last_login_at": admin.last_login_at.isoformat() if admin.last_login_at else None,
        "created_at": admin.created_at.isoformat(),
    }


@api_view(["POST"])
def login(request):
    password = request.data.get("password")
    if not isinstance(password, str):
        return _error("Enter email and password.")
    try:
        email = normalize_email(request.data.get("email"))
    except ValueError:
        return _error("Invalid credentials.", 401)

    admin = Admin.objects.filter(email__iexact=email).first()
    if admin is None or not verify_password(password, admin.password_hash):
        return _error("Invalid credentials.", 401)

    admin.last_login_at = timezone.now()
    admin.save(update_fields=["last_login_at"])
    return Response({
        "access_token": issue_access_token(admin),
        "token_type": "Bearer",
        "expires_in": ACCESS_TOKEN_SECONDS,
        "admin": _public_admin(admin),
    })


@api_view(["POST"])
def forgot_password_request(request):
    try:
        email = normalize_email(request.data.get("email"))
    except ValueError as exc:
        return _error(str(exc))

    throttle = throttle_key(email)
    if not cache.add(throttle, True, timeout=RESEND_AFTER_SECONDS):
        return _error("Wait 30 seconds before requesting another code.", 429)

    request_id = secrets.token_urlsafe(24)
    admin = Admin.objects.filter(email__iexact=email).first()
    if admin is not None:
        code = new_code()
        state = {
            "admin_id": str(admin.id),
            "email": admin.email.lower(),
            "digest": code_digest(request_id, "admin:email", code),
            "attempts": 0,
            "expires_at": time.time() + CODE_TTL_SECONDS,
        }
        key = reset_key(request_id)
        cache.set(key, state, timeout=CODE_TTL_SECONDS)
        try:
            send_reset_code(admin.email, code)
        except Exception as exc:
            logger.error("Admin reset email delivery failed (%s)", type(exc).__name__)
            cache.delete(key)
            cache.delete(throttle)
            return _error("Could not send the code. Try again later.", 503)

    return Response({
        "message": "If an admin account exists, a code was sent.",
        "request_id": request_id,
        "expires_in": CODE_TTL_SECONDS,
        "resend_after": RESEND_AFTER_SECONDS,
    })


@api_view(["POST"])
def forgot_password_confirm(request):
    request_id = str(request.data.get("request_id") or "")
    key = reset_key(request_id)
    state = cache.get(key)
    if not state or time.time() >= state["expires_at"]:
        return _error("Reset request expired or invalid.")

    try:
        validate_new_password(
            request.data.get("new_password"), request.data.get("confirm_password")
        )
    except ValueError as exc:
        return _error(str(exc))

    code = str(request.data.get("code") or "").strip()
    valid = bool(re.fullmatch(r"\d{6}", code)) and hmac.compare_digest(
        code_digest(request_id, "admin:email", code), state["digest"]
    )
    if not valid:
        state["attempts"] += 1
        if state["attempts"] >= MAX_CODE_ATTEMPTS:
            cache.delete(key)
        else:
            remaining = max(1, int(state["expires_at"] - time.time()))
            cache.set(key, state, timeout=remaining)
        return _error("Incorrect or expired code.")

    admin = Admin.objects.filter(id=state["admin_id"]).first()
    if admin is None or admin.email.lower() != state["email"]:
        cache.delete(key)
        return _error("Reset request is no longer valid.")

    admin.password_hash = hash_password(request.data["new_password"])
    admin.save(update_fields=["password_hash"])
    cache.delete(key)
    return Response({"message": "Password updated. Log in with your new password."})


@api_view(["POST"])
def logout(request):
    if admin_from_bearer(request) is None:
        return _error("Missing or expired admin token.", 401)
    return Response({"message": "Logged out"})