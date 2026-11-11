# Small helpers for customer authentication
import base64
import hashlib
import hmac
import logging
import re
import secrets
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from django.core import signing
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email

from .models import Customer

from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException


logger = logging.getLogger(__name__)
CODE_TTL_SECONDS = 600
MAX_CODE_ATTEMPTS = 5
ACCESS_TOKEN_SECONDS = 12 * 60 * 60
PASSWORD_ITERATIONS = 600_000


def normalize_email(value):
    email = str(value or "").strip().lower()
    try:
        validate_email(email)
    except ValidationError as exc:
        raise ValueError("Enter a valid email address.") from exc
    if len(email) > 254:
        raise ValueError("Email address is too long.")
    return email


def normalize_mobile(value):
    mobile = re.sub(r"[\s()\-]", "", str(value or ""))
    if not re.fullmatch(r"(?:\+91)?[6-9]\d{9}", mobile):
        raise ValueError("Enter a 10-digit Indian mobile number or +91 followed by it.")
    return mobile if mobile.startswith("+91") else "+91" + mobile


def validate_new_password(password, confirmation):
    if not isinstance(password, str) or not 8 <= len(password) <= 128:
        raise ValueError("Password must contain 8 to 128 characters.")
    if password != confirmation:
        raise ValueError("Passwords do not match.")


def hash_password(password):
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt), PASSWORD_ITERATIONS
    ).hex()
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${salt}${digest}"


def verify_password(password, encoded):
    try:
        algorithm, iterations, salt, expected = encoded.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        rounds = int(iterations)
        if not 100_000 <= rounds <= 1_000_000:
            return False
        actual = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt), rounds
        ).hex()
        return hmac.compare_digest(actual, expected)
    except (AttributeError, TypeError, ValueError):
        return False


def new_code():
    return f"{secrets.randbelow(1_000_000):06d}"


def code_digest(request_id, channel, code):
    text = f"{request_id}:{channel}:{code}".encode("utf-8")
    return hmac.new(settings.SECRET_KEY.encode("utf-8"), text, hashlib.sha256).hexdigest()


def cache_key(kind, request_id):
    return f"customer:{kind}:{request_id}"


def throttle_key(kind, identifier):
    digest = hashlib.sha256(identifier.encode("utf-8")).hexdigest()
    return f"customer:throttle:{kind}:{digest}"


def send_email_code(to_email, code, purpose):
    sent = send_mail(
        "Your Apna Companion verification code",
        f"Your code for {purpose} is {code}. It expires in 10 minutes.",
        settings.DEFAULT_FROM_EMAIL,
        [to_email],
        fail_silently=False,
    )
    if sent != 1:
        raise RuntimeError("Email service did not accept the message.")


def _verify_service():
    sid = settings.TWILIO_ACCOUNT_SID
    token = settings.TWILIO_AUTH_TOKEN
    service_sid = settings.TWILIO_VERIFY_SERVICE_SID

    if not (sid and token and service_sid):
        raise RuntimeError("Twilio Verify credentials are missing.")

    client = Client(sid, token)
    return client.verify.v2.services(service_sid)


def send_mobile_verification(mobile):
    result = _verify_service().verifications.create(
        to=mobile,
        channel="sms",
    )
    if result.status != "pending":
        raise RuntimeError("Twilio did not start the SMS verification.")


def check_mobile_verification(mobile, code):
    code = str(code or "").strip()
    if not re.fullmatch(r"\d{6}", code):
        return False

    try:
        result = _verify_service().verification_checks.create(
            to=mobile,
            code=code,
        )
    except TwilioRestException as exc:
        # Twilio can return 404 when a verification has expired or was used.
        if exc.status == 404:
            return False
        raise

    return result.status == "approved"


def issue_access_token(customer):
    password_version = hashlib.sha256(customer.password_hash.encode()).hexdigest()
    return signing.dumps(
        {"customer_id": customer.customer_id, "password_version": password_version},
        salt="customer-access-v1",
    )


def customer_from_bearer(request):
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        return None
    try:
        data = signing.loads(
            authorization[7:], salt="customer-access-v1", max_age=ACCESS_TOKEN_SECONDS
        )
        customer = Customer.objects.filter(
            customer_id=data["customer_id"], account_status=Customer.Status.ACTIVE
        ).first()
        if customer is None:
            return None
        version = hashlib.sha256(customer.password_hash.encode()).hexdigest()
        return customer if hmac.compare_digest(version, data["password_version"]) else None
    except (signing.BadSignature, KeyError, TypeError, ValueError):
        return None
