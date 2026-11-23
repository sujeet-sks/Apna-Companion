# Saved addresses for authenticated customers
import re
from decimal import Decimal, InvalidOperation

from django.db import transaction
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .customer_auth import customer_from_bearer
from .models import Customer, CustomerAddress


TEXT_FIELDS = {
    "houseNo": ("house_no", 50, True),
    "buildingStreet": ("building_street", 150, True),
    "areaLocality": ("area_locality", 150, False),
    "landmark": ("landmark", 150, False),
    "city": ("city", 100, True),
    "state": ("state", 100, True),
    "country": ("country", 50, True),
}
EDIT_FIELDS = set(TEXT_FIELDS) | {
    "label", "pincode", "latitude", "longitude", "isDefault",
}


def _error(message, status=400):
    return Response({"detail": message}, status=status)


def _customer(request):
    customer = customer_from_bearer(request)
    if customer is None:
        return None, _error("Missing or expired customer token.", 401)
    return customer, None


def _input(data, key, address, field, default=None):
    if key in data:
        return data[key]
    return getattr(address, field) if address is not None else default


def _coordinate(value, name, limit):
    try:
        number = Decimal(str(value))
        if not number.is_finite() or not -limit <= number <= limit:
            raise ValueError
        return number.quantize(Decimal("0.0000001"))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError(f"{name} must be a valid coordinate.") from exc


def _address_values(data, address=None):
    values = {}
    label = _input(data, "label", address, "label")
    if not isinstance(label, str) or label not in {"HOME", "WORK", "OTHER"}:
        raise ValueError("label must be HOME, WORK, or OTHER.")
    values["label"] = label

    for key, (field, limit, required) in TEXT_FIELDS.items():
        default = "India" if key == "country" else None
        value = _input(data, key, address, field, default)
        if value is None and not required:
            values[field] = None
            continue
        if not isinstance(value, str) or len(value.strip()) > limit:
            raise ValueError(f"{key} must be text of at most {limit} characters.")
        value = value.strip()
        if required and not value:
            raise ValueError(f"{key} is required.")
        values[field] = value or None

    pincode = _input(data, "pincode", address, "pincode")
    if not isinstance(pincode, str) or re.fullmatch(r"[0-9]{6}", pincode) is None:
        raise ValueError("pincode must be a six-digit string.")
    values["pincode"] = pincode
    for key, limit in (("latitude", 90), ("longitude", 180)):
        value = _input(data, key, address, key)
        values[key] = _coordinate(value, key, limit)

    is_default = _input(data, "isDefault", address, "is_default", False)
    if type(is_default) is not bool:
        raise ValueError("isDefault must be true or false.")
    values["is_default"] = is_default
    return values


def _address_data(address):
    return {
        "addressId": address.address_id,
        "label": address.label,
        "houseNo": address.house_no,
        "buildingStreet": address.building_street,
        "areaLocality": address.area_locality,
        "landmark": address.landmark,
        "city": address.city,
        "state": address.state,
        "pincode": address.pincode,
        "country": address.country,
        "isDefault": address.is_default,
        "latitude": float(address.latitude),
        "longitude": float(address.longitude),
    }


@api_view(["POST"])
def save_new_address(request):
    customer, failed = _customer(request)
    if failed is not None:
        return failed
    if not isinstance(request.data, dict):
        return _error("Send a JSON object.")
    try:
        values = _address_values(request.data)
    except ValueError as exc:
        return _error(str(exc))

    with transaction.atomic():
        Customer.objects.select_for_update().get(pk=customer.pk)
        active = CustomerAddress.objects.filter(customer=customer, is_active=True)
        if not active.exists():
            values["is_default"] = True
        if values["is_default"]:
            active.filter(is_default=True).update(is_default=False)
        address = CustomerAddress.objects.create(customer=customer, **values)

    return Response({
        "success": 200,
        "data": {"message": "Address added successfully", "addressId": address.address_id},
    })


@api_view(["POST"])
def edit_existing_address(request):
    customer, failed = _customer(request)
    if failed is not None:
        return failed
    if not isinstance(request.data, dict):
        return _error("Send a JSON object.")
    address_id = request.data.get("addressId")
    if type(address_id) is not int or address_id <= 0:
        return _error("addressId must be a positive number.")
    if not EDIT_FIELDS.intersection(request.data):
        return _error("Send at least one address field to edit.")

    with transaction.atomic():
        Customer.objects.select_for_update().get(pk=customer.pk)
        address = CustomerAddress.objects.filter(
            address_id=address_id, customer=customer, is_active=True,
        ).first()
        if address is None:
            return _error("Address not found.", 404)
        try:
            values = _address_values(request.data, address)
        except ValueError as exc:
            return _error(str(exc))

        active = CustomerAddress.objects.filter(customer=customer, is_active=True)
        if values["is_default"]:
            active.filter(is_default=True).exclude(pk=address.pk).update(is_default=False)
        elif address.is_default:
            replacement = active.exclude(pk=address.pk).order_by("address_id").first()
            if replacement is None:
                values["is_default"] = True
            else:
                address.is_default = False
                address.save(update_fields=["is_default"])
                replacement.is_default = True
                replacement.save(update_fields=["is_default"])

        for field, value in values.items():
            setattr(address, field, value)
        address.save(update_fields=list(values))

    return Response({
        "success": 200,
        "data": {"message": "Address modified successfully"},
    })


@api_view(["POST"])
def get_all_saved_address(request):
    customer, failed = _customer(request)
    if failed is not None:
        return failed
    addresses = CustomerAddress.objects.filter(
        customer=customer, is_active=True,
    ).order_by("-is_default", "address_id")
    return Response({
        "success": 200,
        "message": "Addresses fetched successfully",
        "data": [_address_data(address) for address in addresses],
    })


@api_view(["POST"])
def delete_address(request):
    customer, failed = _customer(request)
    if failed is not None:
        return failed
    if not isinstance(request.data, dict):
        return _error("Send a JSON object.")
    address_id = request.data.get("addressId")
    if type(address_id) is not int or address_id <= 0:
        return _error("addressId must be a positive number.")

    with transaction.atomic():
        Customer.objects.select_for_update().get(pk=customer.pk)
        address = CustomerAddress.objects.filter(
            address_id=address_id, customer=customer, is_active=True,
        ).first()
        if address is None:
            return _error("Address not found.", 404)
        was_default = address.is_default
        address.is_active = False
        address.is_default = False
        address.save(update_fields=["is_active", "is_default"])
        if was_default:
            replacement = CustomerAddress.objects.filter(
                customer=customer, is_active=True,
            ).order_by("address_id").first()
            if replacement is not None:
                replacement.is_default = True
                replacement.save(update_fields=["is_default"])

    return Response({
        "success": 200,
        "message": "Address deleted successfully",
        "data": {},
    })