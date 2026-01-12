import pytest
from decimal import Decimal

from django.utils import timezone
from django.contrib.auth import get_user_model

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
