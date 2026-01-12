import pytest
from datetime import datetime
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.utils import timezone
from django.contrib.auth import get_user_model

from customer.models import Customer
from events.models import Appointment, AppointmentPayment
from products.models import Product
from common.utils import APPOINTMENT_TYPES

pytestmark = pytest.mark.django_db

User = get_user_model()


def test_appointment_str_format():
    user = User.objects.create_user(username="creator", password="pass")
    customer = Customer.objects.create(
        customer_name="A",
        customer_surname="B",
        customer_phone="1200000000",
        created_by=user,
    )
    product = Product.objects.create(name="Consult", created_by=user)
    scheduled = timezone.make_aware(datetime(2025, 1, 2, 15, 30))
    appointment = Appointment.objects.create(
        name="Visit",
        scheduled_for=scheduled,
        appointment_type=APPOINTMENT_TYPES[0][0],
        customer=customer,
        product=product,
        created_by=user,
    )
    assert "Visit" in str(appointment)
    assert "02-01-2025 15:30" in str(appointment)


def test_appointment_payment_clean_rejects_overpayment():
    user = User.objects.create_user(username="pay", password="pass")
    customer = Customer.objects.create(
        customer_name="C",
        customer_surname="D",
        customer_phone="1200000001",
        created_by=user,
    )
    product = Product.objects.create(name="Service", created_by=user)
    appointment = Appointment.objects.create(
        name="Pay",
        scheduled_for=timezone.now(),
        appointment_type=APPOINTMENT_TYPES[0][0],
        customer=customer,
        product=product,
        created_by=user,
    )
    payment = AppointmentPayment(
        appointment=appointment,
        total_amount=Decimal("100.00"),
        paid_amount=Decimal("120.00"),
        remaining_amount=Decimal("0.00"),
        payment_date=timezone.now(),
    )
    with pytest.raises(ValidationError):
        payment.clean()
