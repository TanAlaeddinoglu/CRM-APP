import pytest
from datetime import timedelta

from django.utils import timezone

from customer.models import Customer
from events.serializers import AppointmentSerializer, AppointmentPaymentSerializer
from events.models import Appointment
from products.models import Product
from common.utils import APPOINTMENT_TYPES, PAYMENT_STATUS


@pytest.mark.django_db
def test_appointment_serializer_rejects_past_datetime(admin_user):
    customer = Customer.objects.create(
        customer_name="Past",
        customer_surname="Check",
        customer_email="past@example.com",
        customer_phone="55555555555",
        created_by=admin_user,
    )
    product = Product.objects.create(name="Consultation", created_by=admin_user)

    past_time = timezone.now() - timedelta(hours=1)
    data = {
        "name": "Too Late",
        "scheduled_for": past_time,
        "appointment_type": APPOINTMENT_TYPES[0][0],
        "customer": customer.pk,
        "product": product.pk,
    }

    serializer = AppointmentSerializer(data=data)

    assert not serializer.is_valid()
    assert "scheduled_for" in serializer.errors


@pytest.mark.django_db
def test_appointment_serializer_prevents_double_booking(admin_user):
    customer = Customer.objects.create(
        customer_name="Double",
        customer_surname="Booked",
        customer_email="double@example.com",
        customer_phone="55555555556",
        created_by=admin_user,
    )
    product = Product.objects.create(name="Surgery", created_by=admin_user)
    scheduled_for = timezone.now() + timedelta(days=1)

    Appointment.objects.create(
        name="Existing",
        scheduled_for=scheduled_for,
        appointment_type=APPOINTMENT_TYPES[0][0],
        customer=customer,
        product=product,
        created_by=admin_user,
    )

    data = {
        "name": "Duplicate",
        "scheduled_for": scheduled_for,
        "appointment_type": APPOINTMENT_TYPES[0][0],
        "customer": customer.pk,
        "product": product.pk,
    }

    serializer = AppointmentSerializer(data=data)

    assert not serializer.is_valid()
    assert "scheduled_for" in serializer.errors


@pytest.mark.django_db
def test_payment_serializer_flags_overpayment(admin_user):
    customer = Customer.objects.create(
        customer_name="Pay",
        customer_surname="Tester",
        customer_email="pay@example.com",
        customer_phone="55555555557",
        created_by=admin_user,
    )
    product = Product.objects.create(name="Therapy", created_by=admin_user)
    appointment = Appointment.objects.create(
        name="Pay Check",
        scheduled_for=timezone.now() + timedelta(days=2),
        appointment_type=APPOINTMENT_TYPES[0][0],
        customer=customer,
        product=product,
        created_by=admin_user,
    )

    data = {
        "appointment": appointment.pk,
        "total_amount": "100.00",
        "paid_amount": "150.00",
        "payment_status": PAYMENT_STATUS[0][0],
    }

    serializer = AppointmentPaymentSerializer(data=data)

    assert not serializer.is_valid()
    assert "paid_amount" in serializer.errors
