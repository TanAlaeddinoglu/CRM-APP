import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch

from django.utils import timezone
from rest_framework import serializers
from rest_framework.test import APIRequestFactory

from common.utils import APPOINTMENT_TYPES
from customer.models import Customer
from events.models import Appointment, AppointmentPayment
from events.serializers import AppointmentPaymentSerializer, AppointmentSerializer
from products.models import Product
from django.contrib.auth import get_user_model

pytestmark = pytest.mark.django_db

User = get_user_model()


def _make_customer(user, phone):
    return Customer.objects.create(
        customer_name="Cust",
        customer_surname="User",
        customer_phone=phone,
        created_by=user,
    )


def _make_product(user, name="Service"):
    return Product.objects.create(name=name, created_by=user)


def test_appointment_serializer_rejects_past_datetime():
    user = User.objects.create_user(username="past", password="pass")
    customer = _make_customer(user, "1300000000")
    product = _make_product(user, "Consult")

    past_time = timezone.now() - timedelta(hours=1)
    data = {
        "name": "Too Late",
        "scheduled_for": past_time,
        "appointment_type": APPOINTMENT_TYPES[0][0],
        "customer_id": customer.pk,
        "product_id": product.pk,
    }

    serializer = AppointmentSerializer(data=data)

    assert not serializer.is_valid()
    assert "scheduled_for" in serializer.errors


def test_appointment_serializer_makes_naive_datetime_aware():
    user = User.objects.create_user(username="aware", password="pass")
    customer = _make_customer(user, "1300000001")
    product = _make_product(user, "Aware")

    naive_future = datetime.now() + timedelta(days=1)
    serializer = AppointmentSerializer(
        data={
            "name": "Future",
            "scheduled_for": naive_future,
            "appointment_type": APPOINTMENT_TYPES[0][0],
            "customer_id": customer.pk,
            "product_id": product.pk,
        }
    )

    assert serializer.is_valid(), serializer.errors
    assert timezone.is_aware(serializer.validated_data["scheduled_for"])


def test_appointment_serializer_prevents_double_booking():
    user = User.objects.create_user(username="double", password="pass")
    customer = _make_customer(user, "1300000002")
    product = _make_product(user, "Surgery")
    scheduled_for = timezone.now() + timedelta(days=1)

    Appointment.objects.create(
        name="Existing",
        scheduled_for=scheduled_for,
        appointment_type=APPOINTMENT_TYPES[0][0],
        customer=customer,
        product=product,
        created_by=user,
    )

    data = {
        "name": "Duplicate",
        "scheduled_for": scheduled_for,
        "appointment_type": APPOINTMENT_TYPES[0][0],
        "customer_id": customer.pk,
        "product_id": product.pk,
    }

    serializer = AppointmentSerializer(data=data)

    assert not serializer.is_valid()
    assert "scheduled_for" in serializer.errors


def test_appointment_serializer_sets_created_by():
    user = User.objects.create_user(username="creator", password="pass")
    customer = _make_customer(user, "1300000003")
    product = _make_product(user, "Create")
    factory = APIRequestFactory()
    request = factory.post("/appointments/")
    request.user = user

    serializer = AppointmentSerializer(
        data={
            "name": "New",
            "scheduled_for": timezone.now() + timedelta(days=1),
            "appointment_type": APPOINTMENT_TYPES[0][0],
            "customer_id": customer.pk,
            "product_id": product.pk,
        },
        context={"request": request},
    )
    assert serializer.is_valid(), serializer.errors
    appointment = serializer.save()
    assert appointment.created_by == user


def test_appointment_serializer_sets_updated_by():
    user = User.objects.create_user(username="upd", password="pass")
    customer = _make_customer(user, "1300000004")
    product = _make_product(user, "Update")
    appointment = Appointment.objects.create(
        name="Old",
        scheduled_for=timezone.now() + timedelta(days=1),
        appointment_type=APPOINTMENT_TYPES[0][0],
        customer=customer,
        product=product,
        created_by=user,
    )
    factory = APIRequestFactory()
    request = factory.patch("/appointments/")
    request.user = user

    serializer = AppointmentSerializer(
        appointment,
        data={"name": "Updated"},
        partial=True,
        context={"request": request},
    )
    assert serializer.is_valid(), serializer.errors
    updated = serializer.save()
    assert updated.updated_by == user


def test_payment_serializer_requires_total_on_first_payment():
    user = User.objects.create_user(username="first", password="pass")
    customer = _make_customer(user, "1300000005")
    product = _make_product(user, "Therapy")
    appointment = Appointment.objects.create(
        name="Pay",
        scheduled_for=timezone.now() + timedelta(days=2),
        appointment_type=APPOINTMENT_TYPES[0][0],
        customer=customer,
        product=product,
        created_by=user,
    )

    data = {
        "appointment": appointment.pk,
        "paid_amount": "10.00",
        "payment_date": timezone.now(),
    }
    serializer = AppointmentPaymentSerializer(data=data)
    assert not serializer.is_valid()
    assert "total_amount" in serializer.errors


def test_payment_serializer_uses_previous_total_and_sets_remaining():
    user = User.objects.create_user(username="pay", password="pass")
    customer = _make_customer(user, "1300000006")
    product = _make_product(user, "Plan")
    appointment = Appointment.objects.create(
        name="Plan",
        scheduled_for=timezone.now() + timedelta(days=2),
        appointment_type=APPOINTMENT_TYPES[0][0],
        customer=customer,
        product=product,
        created_by=user,
    )
    AppointmentPayment.objects.create(
        appointment=appointment,
        total_amount=Decimal("100.00"),
        paid_amount=Decimal("40.00"),
        remaining_amount=Decimal("60.00"),
        payment_date=timezone.now(),
    )
    factory = APIRequestFactory()
    request = factory.post("/payments/")
    request.user = user

    serializer = AppointmentPaymentSerializer(
        data={
            "appointment": appointment.pk,
            "total_amount": "100.00",
            "paid_amount": "60.00",
            "payment_date": timezone.now(),
        },
        context={"request": request},
    )
    assert serializer.is_valid(), serializer.errors
    payment = serializer.save()

    assert payment.total_amount == Decimal("100.00")
    assert payment.remaining_amount == Decimal("0.00")
    assert payment.payment_status == "tamamlandi"


def test_payment_serializer_rejects_overpayment_across_payments():
    user = User.objects.create_user(username="over", password="pass")
    customer = _make_customer(user, "1300000007")
    product = _make_product(user, "Over")
    appointment = Appointment.objects.create(
        name="Over",
        scheduled_for=timezone.now() + timedelta(days=2),
        appointment_type=APPOINTMENT_TYPES[0][0],
        customer=customer,
        product=product,
        created_by=user,
    )
    AppointmentPayment.objects.create(
        appointment=appointment,
        total_amount=Decimal("100.00"),
        paid_amount=Decimal("80.00"),
        remaining_amount=Decimal("20.00"),
        payment_date=timezone.now(),
    )

    serializer = AppointmentPaymentSerializer(
        data={
            "appointment": appointment.pk,
            "total_amount": "100.00",
            "paid_amount": "30.00",
            "payment_date": timezone.now(),
        }
    )
    assert serializer.is_valid(), serializer.errors
    with pytest.raises(serializers.ValidationError):
        serializer.save()


def test_payment_serializer_locks_appointment_row_before_total_calculation():
    user = User.objects.create_user(username="lock", password="pass")
    customer = _make_customer(user, "1300000099")
    product = _make_product(user, "Lock")
    appointment = Appointment.objects.create(
        name="Lock",
        scheduled_for=timezone.now() + timedelta(days=2),
        appointment_type=APPOINTMENT_TYPES[0][0],
        customer=customer,
        product=product,
        created_by=user,
    )

    with patch.object(
        Appointment.objects,
        "select_for_update",
        wraps=Appointment.objects.select_for_update,
    ) as select_for_update_mock:
        serializer = AppointmentPaymentSerializer(
            data={
                "appointment": appointment.pk,
                "total_amount": "100.00",
                "paid_amount": "25.00",
                "payment_date": timezone.now(),
            }
        )
        assert serializer.is_valid(), serializer.errors
        payment = serializer.save()

    select_for_update_mock.assert_called_once()
    assert payment.remaining_amount == Decimal("75.00")


def test_payment_serializer_validates_negative_values():
    user = User.objects.create_user(username="neg", password="pass")
    customer = _make_customer(user, "1300000008")
    product = _make_product(user, "Neg")
    appointment = Appointment.objects.create(
        name="Neg",
        scheduled_for=timezone.now() + timedelta(days=2),
        appointment_type=APPOINTMENT_TYPES[0][0],
        customer=customer,
        product=product,
        created_by=user,
    )

    serializer = AppointmentPaymentSerializer(
        data={
            "appointment": appointment.pk,
            "total_amount": "-1.00",
            "paid_amount": "-2.00",
            "payment_date": timezone.now(),
        }
    )
    assert not serializer.is_valid()
    assert "total_amount" in serializer.errors
    assert "paid_amount" in serializer.errors


def test_appointment_payment_serializer_exposes_customer_pk():
    user = User.objects.create_user(username="cpk", password="pass")
    customer = _make_customer(user, "1300000099")
    product = _make_product(user, "CPK")
    appointment = Appointment.objects.create(
        name="CPK Visit",
        scheduled_for=timezone.now() + timedelta(days=1),
        appointment_type=APPOINTMENT_TYPES[0][0],
        customer=customer,
        product=product,
        created_by=user,
    )
    payment = AppointmentPayment.objects.create(
        appointment=appointment,
        total_amount=Decimal("100.00"),
        paid_amount=Decimal("50.00"),
        remaining_amount=Decimal("50.00"),
        payment_status="kismi",
        payment_date=timezone.now(),
    )

    data = AppointmentPaymentSerializer(payment).data
    assert "customer_pk" in data
    assert data["customer_pk"] == customer.pk


def test_appointment_payment_serializer_exposes_customer_name():
    user = User.objects.create_user(username="cname", password="pass")
    customer = Customer.objects.create(
        customer_name="Test",
        customer_surname="Müşteri",
        customer_phone="1300000098",
        created_by=user,
    )
    product = _make_product(user, "CName")
    appointment = Appointment.objects.create(
        name="CName Visit",
        scheduled_for=timezone.now() + timedelta(days=1),
        appointment_type=APPOINTMENT_TYPES[0][0],
        customer=customer,
        product=product,
        created_by=user,
    )
    payment = AppointmentPayment.objects.create(
        appointment=appointment,
        total_amount=Decimal("200.00"),
        paid_amount=Decimal("200.00"),
        remaining_amount=Decimal("0.00"),
        payment_status="tamamlandi",
        payment_date=timezone.now(),
    )

    data = AppointmentPaymentSerializer(payment).data
    assert "customer_name" in data
    assert "Test" in data["customer_name"]
    assert "appointment_name" in data
    assert data["appointment_name"] == "CName Visit"


def test_appointment_serializer_exposes_customer_pk():
    user = User.objects.create_user(username="apk", password="pass")
    customer = _make_customer(user, "1300000097")
    product = _make_product(user, "APK")
    appointment = Appointment.objects.create(
        name="APK Visit",
        scheduled_for=timezone.now() + timedelta(days=1),
        appointment_type=APPOINTMENT_TYPES[0][0],
        customer=customer,
        product=product,
        created_by=user,
    )

    data = AppointmentSerializer(appointment).data
    assert "customer_pk" in data
    assert data["customer_pk"] == customer.pk
