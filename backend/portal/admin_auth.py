import hashlib
import hmac

from django.conf import settings
from django.core import signing
from django.core.exceptions import ValidationError
from django.core.mail import send_mail

from .customer_auth import ACCESS_TOKEN_SECONDS
from .models import Admin


CODE_TTL_SECONDS = 300
RESEND_AFTER_SECONDS = 30


def reset_key(request_id):
    return f"admin:reset:{request_id}"


def throttle_key(email):
    digest = hashlib.sha256(email.encode("utf-8")).hexdigest()
    return f"admin:throttle:reset:{digest}"


def send_reset_code(email, code):
    sent = send_mail(
        "Your Apna Companion admin password reset code",
        f"Your password reset code is {code}. It expires in 5 minutes.",
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )
    if sent != 1:
        raise RuntimeError("Email service did not accept the message.")


def issue_access_token(admin):
    password_version = hashlib.sha256(admin.password_hash.encode("utf-8")).hexdigest()
    return signing.dumps(
        {"admin_id": str(admin.id), "password_version": password_version},
        salt="admin-access-v1",
    )


def admin_from_bearer(request):
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    try:
        data = signing.loads(
            header[7:], salt="admin-access-v1", max_age=ACCESS_TOKEN_SECONDS
        )
        admin = Admin.objects.filter(id=data["admin_id"]).first()
        if admin is None:
            return None
        current = hashlib.sha256(admin.password_hash.encode("utf-8")).hexdigest()
        return admin if hmac.compare_digest(current, data["password_version"]) else None
    except (signing.BadSignature, KeyError, TypeError, ValueError, ValidationError):
        return None