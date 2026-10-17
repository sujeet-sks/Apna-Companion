# Customer registration, login and password reset API endpoints
from datetime import date
import hmac
import logging
import secrets
import time

from django.core.cache import cache
from django.db import IntegrityError, transaction
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .customer_auth import (
    ACCESS_TOKEN_SECONDS, CODE_TTL_SECONDS, MAX_CODE_ATTEMPTS,
    cache_key, code_digest, customer_from_bearer, hash_password,
    issue_access_token, new_code, normalize_email, normalize_mobile,
    send_email_code, send_mobile_verification, check_mobile_verification, throttle_key,
    validate_new_password, verify_password,
)
from .models import Customer


logger = logging.getLogger(__name__)


def _error(message, code=400):
    return Response({"detail": message}, status=code)


def _remaining(state):
    return max(1, int(state["expires_at"] - time.time()))


def _failed_attempt(key, state):
    state["attempts"] += 1
    if state["attempts"] >= MAX_CODE_ATTEMPTS:
        cache.delete(key)
    else:
        cache.set(key, state, timeout=_remaining(state))


def _public_customer(customer):
    return {
        "customer_id": customer.customer_id,
        "full_name": customer.full_name,
        "email_id": customer.email_id,
        "mobile_number": customer.mobile_number,
        "dob": customer.dob.isoformat(),
        "gender": customer.gender,
        "account_status": customer.account_status,
        "created_at": customer.created_at.isoformat(),
        "updated_at": customer.updated_at.isoformat(),
    }


@api_view(["POST"])
def register_start(request):
    try:
        email = normalize_email(request.data.get("email_id"))
        mobile = normalize_mobile(request.data.get("mobile_number"))
        name = str(request.data.get("full_name") or "").strip()
        gender = str(request.data.get("gender") or "").strip()
        dob = date.fromisoformat(str(request.data.get("dob") or ""))
        password = request.data.get("password")
        validate_new_password(password, request.data.get("confirm_password"))
        if not 1 <= len(name) <= 100:
            raise ValueError("Enter a full name of at most 100 characters.")
        if not 1 <= len(gender) <= 30:
            raise ValueError("Enter a gender value of at most 30 characters.")
        if dob > date.today():
            raise ValueError("Date of birth cannot be in the future.")
    except (ValueError, TypeError) as exc:
        return _error(str(exc))

    if Customer.objects.filter(email_id=email).exists():
        return _error("Email is already registered.", 409)
    if Customer.objects.filter(mobile_number=mobile).exists():
        return _error("Mobile number is already registered.", 409)

    throttle = throttle_key("register", email + ":" + mobile)
    if not cache.add(throttle, True, timeout=60):
        return _error("Wait one minute before requesting new codes.", 429)

    request_id = secrets.token_urlsafe(24)
    email_code = new_code()
    state = {
        "email_id": email, "mobile_number": mobile, "full_name": name,
        "dob": dob.isoformat(), "gender": gender,
        "password_hash": hash_password(password),
        "email_digest": code_digest(request_id, "email", email_code),
        "attempts": 0, "expires_at": time.time() + CODE_TTL_SECONDS,
    }
    key = cache_key("register", request_id)
    cache.set(key, state, timeout=CODE_TTL_SECONDS)
    try:
        send_email_code(email, email_code, "registration")
        send_mobile_verification(mobile)
    except Exception:
        logger.exception("Could not deliver customer registration codes")
        cache.delete(key)
        cache.delete(throttle)
        return _error("Could not send the codes. Try again later.", 503)

    return Response({"verification_id": request_id, "expires_in": CODE_TTL_SECONDS})


@api_view(["POST"])
def register_complete(request):
    request_id = str(request.data.get("verification_id") or "")
    key = cache_key("register", request_id)
    state = cache.get(key)
    if not state or time.time() >= state["expires_at"]:
        return _error("Verification expired. Request new codes.")

    email_code = str(request.data.get("email_code") or "").strip()
    mobile_code = str(request.data.get("mobile_code") or "").strip()

    email_ok = hmac.compare_digest(
        code_digest(request_id, "email", email_code),
        state["email_digest"],
    )
    if not email_ok:
        _failed_attempt(key, state)
        return _error("Email code is incorrect.")

    try:
        mobile_ok = check_mobile_verification(
            state["mobile_number"], mobile_code
        )
    except Exception:
        logger.exception("Could not check Twilio registration code")
        return _error("Could not check SMS code. Try again later.", 503)

    if not mobile_ok:
        _failed_attempt(key, state)
        return _error("Mobile code is incorrect or expired.")

    try:
        with transaction.atomic():
            customer = Customer.objects.create(
                email_id=state["email_id"], mobile_number=state["mobile_number"],
                password_hash=state["password_hash"], full_name=state["full_name"],
                dob=date.fromisoformat(state["dob"]), gender=state["gender"],
                account_status=Customer.Status.ACTIVE,
            )
    except IntegrityError:
        cache.delete(key)
        return _error("Email or mobile number is already registered.", 409)
    cache.delete(key)
    return Response({"message": "Customer registered.", "customer": _public_customer(customer)}, status=201)


@api_view(["POST"])
def login(request):
    identifier = str(request.data.get("identifier") or "").strip()
    password = request.data.get("password")
    if not identifier or not isinstance(password, str):
        return _error("Enter email/mobile and password.")
    try:
        if "@" in identifier:
            customer = Customer.objects.filter(email_id=normalize_email(identifier)).first()
        else:
            customer = Customer.objects.filter(mobile_number=normalize_mobile(identifier)).first()
    except ValueError:
        customer = None
    if not customer or customer.account_status != Customer.Status.ACTIVE or not verify_password(password, customer.password_hash):
        return _error("Invalid credentials or inactive account.", 401)
    return Response({
        "access_token": issue_access_token(customer),
        "token_type": "Bearer", "expires_in": ACCESS_TOKEN_SECONDS,
        "customer": _public_customer(customer),
    })


@api_view(["POST"])
def forgot_password_request(request):
    identifier = str(request.data.get("identifier") or "").strip()
    try:
        if "@" in identifier:
            channel, value = "email", normalize_email(identifier)
            customer = Customer.objects.filter(email_id=value, account_status=Customer.Status.ACTIVE).first()
        else:
            channel, value = "mobile", normalize_mobile(identifier)
            customer = Customer.objects.filter(mobile_number=value, account_status=Customer.Status.ACTIVE).first()
    except ValueError as exc:
        return _error(str(exc))

    throttle = throttle_key("reset", channel + ":" + value)
    if not cache.add(throttle, True, timeout=60):
        return _error("Wait one minute before requesting another code.", 429)

    request_id = secrets.token_urlsafe(24)
    if customer:
        state = {
            "customer_id": customer.customer_id,
            "channel": channel,
            "identifier": value,
            "attempts": 0,
            "expires_at": time.time() + CODE_TTL_SECONDS,
        }

        if channel == "email":
            code = new_code()
            state["code_digest"] = code_digest(request_id, channel, code)

        key = cache_key("reset", request_id)
        cache.set(key, state, timeout=CODE_TTL_SECONDS)

        try:
            if channel == "email":
                send_email_code(value, code, "password reset")
            else:
                send_mobile_verification(value)
        except Exception:
            logger.exception("Could not deliver customer password reset code")
            cache.delete(key)
            cache.delete(throttle)
            return _error("Could not send the code. Try again later.", 503)
    return Response({
        "message": "If an active account exists, a code was sent.",
        "request_id": request_id, "expires_in": CODE_TTL_SECONDS,
    })


@api_view(["POST"])
def forgot_password_confirm(request):
    request_id = str(request.data.get("request_id") or "")
    key = cache_key("reset", request_id)
    state = cache.get(key)
    if not state or time.time() >= state["expires_at"]:
        return _error("Reset request expired or invalid.")
    try:
        validate_new_password(request.data.get("new_password"), request.data.get("confirm_password"))
    except ValueError as exc:
        return _error(str(exc))

    code = str(request.data.get("code") or "").strip()

    if state["channel"] == "email":
        valid = hmac.compare_digest(
            code_digest(request_id, "email", code),
            state["code_digest"],
        )
    else:
        try:
            valid = check_mobile_verification(state["identifier"], code)
        except Exception:
            logger.exception("Could not check Twilio password reset code")
            return _error("Could not check SMS code. Try again later.", 503)

    if not valid:
        _failed_attempt(key, state)
        return _error("Incorrect or expired code.")

    customer = Customer.objects.filter(
        customer_id=state["customer_id"], account_status=Customer.Status.ACTIVE
    ).first()
    if not customer or getattr(customer, "email_id" if state["channel"] == "email" else "mobile_number") != state["identifier"]:
        cache.delete(key)
        return _error("Reset request is no longer valid.")

    customer.password_hash = hash_password(request.data["new_password"])
    customer.save(update_fields=["password_hash", "updated_at"])
    cache.delete(key)
    return Response({"message": "Password updated. Log in with your new password."})


@api_view(["GET"])
def me(request):
    customer = customer_from_bearer(request)
    if customer is None:
        return _error("Missing or expired customer token.", 401)
    return Response({"customer": _public_customer(customer)})
