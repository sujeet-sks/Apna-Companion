# Small helpers for organization and companion authentication
import hashlib
import hmac
import logging
import re
import secrets
import time

from django.conf import settings
from django.core import signing
from django.core.cache import cache
from rest_framework.response import Response

from .customer_auth import (
    ACCESS_TOKEN_SECONDS, CODE_TTL_SECONDS, MAX_CODE_ATTEMPTS,
    code_digest, hash_password, new_code, normalize_email,
    send_email_code, validate_new_password, verify_password,
)
from .models import Companion, Organization


logger = logging.getLogger(__name__)


def ok(data, status=200):
    return Response({"status_code": status, "data": data}, status=status)


def error(message, status=400):
    return Response({"status_code": status, "message": message}, status=status)


def _key(role, kind, request_id):
    return f"{role}:{kind}:{request_id}"


def _throttle(role, kind, email):
    digest = hashlib.sha256(email.encode("utf-8")).hexdigest()
    return f"{role}:throttle:{kind}:{digest}"


def start_email_code(role, kind, email, payload, purpose):
    # Store expiring request data and a code hash, then email the code
    throttle = _throttle(role, kind, email)
    if not cache.add(throttle, True, timeout=60):
        return None, error("Wait one minute before requesting another code.", 429)

    request_id = secrets.token_urlsafe(24)
    code = new_code()
    state = {
        **payload,
        "email": email,
        "digest": code_digest(request_id, f"{role}:email", code),
        "attempts": 0,
        "expires_at": time.time() + CODE_TTL_SECONDS,
    }
    key = _key(role, kind, request_id)
    cache.set(key, state, timeout=CODE_TTL_SECONDS)
    try:
        send_email_code(email, code, purpose)
    except Exception:
        logger.exception("Could not send %s %s code", role, kind)
        cache.delete(key)
        cache.delete(throttle)
        return None, error("Could not send the code. Try again later.", 503)
    return request_id, None


def verify_email_code(role, kind, request_id, code):
    # Return cached state after correct code; delete after five wrong attempts
    key = _key(role, kind, request_id)
    state = cache.get(key)
    if not state or time.time() >= state["expires_at"]:
        return None, error("Code request expired or invalid.")
    code = str(code or "").strip()
    valid = bool(re.fullmatch(r"\d{6}", code)) and hmac.compare_digest(
        code_digest(request_id, f"{role}:email", code), state["digest"]
    )
    if not valid:
        state["attempts"] += 1
        if state["attempts"] >= MAX_CODE_ATTEMPTS:
            cache.delete(key)
        else:
            cache.set(key, state, timeout=max(1, int(state["expires_at"] - time.time())))
        return None, error("Incorrect email code.")
    return state, None


def consume_email_code(role, kind, request_id):
    cache.delete(_key(role, kind, request_id))


def active_account(role, account):
    if not account or not account.is_active:
        return False
    if role == "companion":
        org = account.organization
        return org.is_active and org.approval_status == "approved"
    return True  # Pending/rejected organizations can still log in and reset passwords


def issue_token(role, account):
    account_id = account.organization_id if role == "organization" else account.companion_id
    version = hashlib.sha256(account.password_hash.encode("utf-8")).hexdigest()
    return signing.dumps(
        {"role": role, "id": account_id, "password_version": version},
        salt=f"{role}-access-v1",
    )


def from_bearer(request, role):
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    try:
        data = signing.loads(
            header[7:], salt=f"{role}-access-v1", max_age=ACCESS_TOKEN_SECONDS
        )
        if data.get("role") != role:
            return None
        if role == "organization":
            account = Organization.objects.filter(organization_id=data["id"]).first()
        else:
            account = Companion.objects.select_related("organization").filter(companion_id=data["id"]).first()
        if not active_account(role, account):
            return None
        current = hashlib.sha256(account.password_hash.encode("utf-8")).hexdigest()
        return account if hmac.compare_digest(current, data["password_version"]) else None
    except (signing.BadSignature, KeyError, TypeError, ValueError):
        return None


def login_account(role, raw_email, password):
    if not isinstance(password, str):
        return error("Enter email and password.")
    try:
        email = normalize_email(raw_email)
    except ValueError:
        return error("Invalid credentials or inactive account.", 401)
    if role == "organization":
        account = Organization.objects.filter(email__iexact=email).first()
    else:
        account = Companion.objects.select_related("organization").filter(email__iexact=email).first()
    if not active_account(role, account) or not verify_password(password, account.password_hash):
        return error("Invalid credentials or inactive account.", 401)
    account_id = account.organization_id if role == "organization" else account.companion_id
    data = {
        "access_token": issue_token(role, account), "token_type": "Bearer",
        "expires_in": ACCESS_TOKEN_SECONDS, "role": role,
        f"{role}_id": account_id,
    }
    if role == "companion":
        data["organization_id"] = account.organization_id
    return ok(data)


def reset_request(role, raw_email):
    try:
        email = normalize_email(raw_email)
    except ValueError as exc:
        return error(str(exc))
    model = Organization if role == "organization" else Companion
    queryset = model.objects.filter(email__iexact=email)
    if role == "companion":
        queryset = queryset.select_related("organization")
    account = queryset.first()
    request_id = secrets.token_urlsafe(24)
    if active_account(role, account):
        account_id = account.organization_id if role == "organization" else account.companion_id
        request_id, failed = start_email_code(
            role, "reset", email, {"account_id": account_id}, "password reset"
        )
        if failed:
            return failed
    return ok({
        "message": "If an active account exists, a code was sent.",
        "request_id": request_id, "expires_in": CODE_TTL_SECONDS,
    })


def reset_complete(role, data):
    request_id = str(data.get("request_id") or "")
    try:
        validate_new_password(data.get("new_password"), data.get("confirm_password"))
    except ValueError as exc:
        return error(str(exc))
    state, failed = verify_email_code(role, "reset", request_id, data.get("code"))
    if failed:
        return failed
    if role == "organization":
        account = Organization.objects.filter(organization_id=state["account_id"]).first()
    else:
        account = Companion.objects.select_related("organization").filter(companion_id=state["account_id"]).first()
    if not active_account(role, account) or account.email.lower() != state["email"]:
        consume_email_code(role, "reset", request_id)
        return error("Reset request is no longer valid.")
    account.password_hash = hash_password(data["new_password"])
    account.save(update_fields=["password_hash", "updated_at"])
    consume_email_code(role, "reset", request_id)
    return ok({"message": "Password updated. Log in with your new password."})


def change_password(account, data):
    if not isinstance(data.get("current_password"), str) or not verify_password(
        data["current_password"], account.password_hash
    ):
        return error("Current password is incorrect.")
    try:
        validate_new_password(data.get("new_password"), data.get("confirm_password"))
    except ValueError as exc:
        return error(str(exc))
    account.password_hash = hash_password(data["new_password"])
    account.save(update_fields=["password_hash", "updated_at"])
    return ok({"message": "Password changed"})


def issue_resubmission_token(org):
    """Admin rejection email can call this helper and send its link to org.email."""
    return signing.dumps(
        {"organization_id": org.organization_id, "email": org.email.lower()},
        salt="org-resubmit-v1",
    )


def organization_for_resubmission(token):
    try:
        data = signing.loads(token, salt="org-resubmit-v1", max_age=7 * 24 * 60 * 60)
        org = Organization.objects.filter(organization_id=data["organization_id"]).first()
        if org and org.is_active and org.approval_status == "rejected" and org.email.lower() == data["email"]:
            return org
    except (signing.BadSignature, KeyError, TypeError, ValueError):
        pass
    return None