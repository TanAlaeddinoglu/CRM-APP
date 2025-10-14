from rest_framework.exceptions import ValidationError

from customer.models import Customer


def validate_customer_phone(phone_number: str) -> str:
    """
    Ensure phone numbers are present, unique, and exactly 11 digits long.
    Returns the validated phone number or raises a ValidationError.
    """
    if not phone_number:
        raise ValidationError({"customer_phone": ["Phone number is required."]})

    trimmed = str(phone_number).strip()

    if len(trimmed) != 11 or not trimmed.isdigit():
        raise ValidationError({"customer_phone": ["Phone number must be exactly 11 digits."]})

    if Customer.objects.filter(customer_phone=trimmed).exists():
        raise ValidationError({"customer_phone": ["Phone number already exists."]})

    return trimmed
