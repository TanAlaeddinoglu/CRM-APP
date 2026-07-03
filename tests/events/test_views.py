import pytest
from datetime import timedelta
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from common.utils import APPOINTMENT_TYPES, PAYMENT_STATUS
from customer.models import Customer
from events.models import Appointment, AppointmentPayment
from events.views import AppointmentPaymentsViewSet
from products.models import Product

pytestmark = pytest.mark.django_db

User = get_user_model()


def test_appointment_payments_viewset_perform_destroy_updates_last_payment():
    user = User.objects.create_user(username="pay", password="pass")
    customer = Customer.objects.create(
        customer_name="A",
        customer_surname="B",
        customer_phone="1400000000",
        created_by=user,
    )
    product = Product.objects.create(name="Service", created_by=user)
    appointment = Appointment.objects.create(
        name="Visit",
        scheduled_for=timezone.now(),
        appointment_type=APPOINTMENT_TYPES[0][0],
        customer=customer,
        product=product,
        created_by=user,
    )
    payment1 = AppointmentPayment.objects.create(
        appointment=appointment,
        total_amount=Decimal("100.00"),
        paid_amount=Decimal("40.00"),
        remaining_amount=Decimal("60.00"),
        payment_status=PAYMENT_STATUS[0][0],
        payment_date=timezone.now(),
    )
    payment2 = AppointmentPayment.objects.create(
        appointment=appointment,
        total_amount=Decimal("100.00"),
        paid_amount=Decimal("60.00"),
        remaining_amount=Decimal("0.00"),
        payment_status=PAYMENT_STATUS[1][0],
        payment_date=timezone.now(),
    )

    viewset = AppointmentPaymentsViewSet()
    viewset.perform_destroy(payment2)

    payment1.refresh_from_db()
    assert payment1.remaining_amount == Decimal("60.00")
    assert payment1.payment_status == PAYMENT_STATUS[0][0]


def test_appointment_payments_can_filter_by_preset():
    admin = User.objects.create_user(
        username="payment-admin",
        password="pass",
        role=User.Role.ADMIN,
    )
    customer = Customer.objects.create(
        customer_name="Preset",
        customer_surname="Filter",
        customer_phone="1500000000",
        created_by=admin,
    )
    product = Product.objects.create(name="Preset Product", created_by=admin)
    appointment = Appointment.objects.create(
        name="Preset Visit",
        scheduled_for=timezone.now(),
        appointment_type=APPOINTMENT_TYPES[0][0],
        customer=customer,
        product=product,
        created_by=admin,
    )
    recent_payment = AppointmentPayment.objects.create(
        appointment=appointment,
        total_amount=Decimal("100.00"),
        paid_amount=Decimal("40.00"),
        remaining_amount=Decimal("60.00"),
        payment_status=PAYMENT_STATUS[0][0],
        payment_date=timezone.now() - timedelta(days=2),
    )
    old_payment = AppointmentPayment.objects.create(
        appointment=appointment,
        total_amount=Decimal("100.00"),
        paid_amount=Decimal("20.00"),
        remaining_amount=Decimal("80.00"),
        payment_status=PAYMENT_STATUS[0][0],
        payment_date=timezone.now() - timedelta(days=20),
    )

    client = APIClient()
    client.force_authenticate(user=admin)
    response = client.get(reverse("appointment-payments"), {"preset": "7"})

    assert response.status_code == 200
    ids = [row["id"] for row in response.data["results"]]
    assert recent_payment.id in ids
    assert old_payment.id not in ids


def test_appointments_can_exclude_reminders_for_payment_lookup():
    admin = User.objects.create_user(
        username="appointment-admin",
        password="pass",
        role=User.Role.ADMIN,
    )
    customer = Customer.objects.create(
        customer_name="Payment",
        customer_surname="Lookup",
        customer_phone="1550000000",
        created_by=admin,
    )
    product = Product.objects.create(name="Lookup Product", created_by=admin)
    payable_appointment = Appointment.objects.create(
        name="Payable Visit",
        scheduled_for=timezone.now(),
        appointment_type="muayene",
        customer=customer,
        product=product,
        created_by=admin,
    )
    reminder_appointment = Appointment.objects.create(
        name="Reminder Visit",
        scheduled_for=timezone.now(),
        appointment_type="hatirlatma",
        customer=customer,
        product=product,
        created_by=admin,
    )

    client = APIClient()
    client.force_authenticate(user=admin)
    response = client.get(
        reverse("appointments"),
        {"search": "Visit", "excludeAppointmentType": "hatirlatma"},
    )

    assert response.status_code == 200
    ids = [row["id"] for row in response.data["results"]]
    assert payable_appointment.id in ids
    assert reminder_appointment.id not in ids


def test_appointments_can_exclude_negative_status_for_payment_lookup():
    admin = User.objects.create_user(
        username="appointment-status-admin",
        password="pass",
        role=User.Role.ADMIN,
    )
    customer = Customer.objects.create(
        customer_name="Status",
        customer_surname="Lookup",
        customer_phone="1560000000",
        created_by=admin,
    )
    product = Product.objects.create(name="Status Product", created_by=admin)
    payable_appointment = Appointment.objects.create(
        name="Status Visit",
        scheduled_for=timezone.now(),
        appointment_type="muayene",
        status="satis",
        customer=customer,
        product=product,
        created_by=admin,
    )
    negative_appointment = Appointment.objects.create(
        name="Status Visit Negative",
        scheduled_for=timezone.now(),
        appointment_type="muayene",
        status="olumsuz",
        customer=customer,
        product=product,
        created_by=admin,
    )

    client = APIClient()
    client.force_authenticate(user=admin)
    response = client.get(
        reverse("appointments"),
        {"search": "Status Visit", "excludeStatus": "olumsuz"},
    )

    assert response.status_code == 200
    ids = [row["id"] for row in response.data["results"]]
    assert payable_appointment.id in ids
    assert negative_appointment.id not in ids


def test_admin_can_search_appointments_by_customer_phone():
    admin = User.objects.create_user(
        username="phone-search-admin",
        password="pass",
        role=User.Role.ADMIN,
    )
    customer = Customer.objects.create(
        customer_name="Phone",
        customer_surname="Search",
        customer_phone="905551112233",
        created_by=admin,
    )
    product = Product.objects.create(name="Phone Product", created_by=admin)
    appointment = Appointment.objects.create(
        name="Phone Lookup Visit",
        scheduled_for=timezone.now(),
        appointment_type="muayene",
        customer=customer,
        product=product,
        created_by=admin,
    )

    client = APIClient()
    client.force_authenticate(user=admin)
    response = client.get(reverse("appointments"), {"search": "5551112233"})

    assert response.status_code == 200
    ids = [row["id"] for row in response.data["results"]]
    assert appointment.id in ids


def test_appointment_payments_filter_by_payment_status():
    admin = User.objects.create_user(
        username="status-filter-admin",
        password="pass",
        role=User.Role.ADMIN,
    )
    customer = Customer.objects.create(
        customer_name="Status",
        customer_surname="Filter",
        customer_phone="1600000000",
        created_by=admin,
    )
    product = Product.objects.create(name="Status Product", created_by=admin)
    appointment = Appointment.objects.create(
        name="Status Visit",
        scheduled_for=timezone.now(),
        appointment_type=APPOINTMENT_TYPES[0][0],
        customer=customer,
        product=product,
        created_by=admin,
    )
    partial_payment = AppointmentPayment.objects.create(
        appointment=appointment,
        total_amount=Decimal("100.00"),
        paid_amount=Decimal("40.00"),
        remaining_amount=Decimal("60.00"),
        payment_status="kismi",
        payment_date=timezone.now(),
    )
    completed_payment = AppointmentPayment.objects.create(
        appointment=appointment,
        total_amount=Decimal("200.00"),
        paid_amount=Decimal("200.00"),
        remaining_amount=Decimal("0.00"),
        payment_status="tamamlandi",
        payment_date=timezone.now(),
    )

    client = APIClient()
    client.force_authenticate(user=admin)

    response = client.get(reverse("appointment-payments"), {"payment_status": "kismi"})
    assert response.status_code == 200
    ids = [row["id"] for row in response.data["results"]]
    assert partial_payment.id in ids
    assert completed_payment.id not in ids

    response = client.get(reverse("appointment-payments"), {"payment_status": "tamamlandi"})
    assert response.status_code == 200
    ids = [row["id"] for row in response.data["results"]]
    assert completed_payment.id in ids
    assert partial_payment.id not in ids


def test_appointment_payments_response_includes_customer_pk():
    admin = User.objects.create_user(
        username="cpk-view-admin",
        password="pass",
        role=User.Role.ADMIN,
    )
    customer = Customer.objects.create(
        customer_name="View",
        customer_surname="CPK",
        customer_phone="1600000001",
        created_by=admin,
    )
    product = Product.objects.create(name="CPK View Product", created_by=admin)
    appointment = Appointment.objects.create(
        name="CPK View Visit",
        scheduled_for=timezone.now(),
        appointment_type=APPOINTMENT_TYPES[0][0],
        customer=customer,
        product=product,
        created_by=admin,
    )
    AppointmentPayment.objects.create(
        appointment=appointment,
        total_amount=Decimal("100.00"),
        paid_amount=Decimal("100.00"),
        remaining_amount=Decimal("0.00"),
        payment_status="tamamlandi",
        payment_date=timezone.now(),
    )

    client = APIClient()
    client.force_authenticate(user=admin)
    response = client.get(reverse("appointment-payments"))

    assert response.status_code == 200
    results = response.data["results"]
    assert len(results) > 0
    row = results[0]
    assert "customer_pk" in row
    assert row["customer_pk"] == customer.pk
    assert "customer_name" in row
    assert "appointment_name" in row
