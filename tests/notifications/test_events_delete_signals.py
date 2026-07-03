"""Randevu silme bildirim sinyali testleri."""
import pytest
from django.utils import timezone

import events.notifications.notification_types  # noqa: registry'yi doldur
from notifications.models import Notification, NotificationRule


pytestmark = pytest.mark.django_db(transaction=True)


@pytest.fixture(autouse=True)
def rule(db):
    NotificationRule.objects.get_or_create(
        type_key="events.appointment_deleted",
        is_system_default=True,
        defaults={
            "name": "Randevu silindi",
            "channels": ["in_app"],
            "is_active": True,
        },
    )


@pytest.fixture
def admin_user(db):
    from django.contrib.auth import get_user_model

    return get_user_model().objects.create_user(
        username="ed_admin", email="ed_admin@x.com", password="Pass123!", role="ADMIN"
    )


@pytest.fixture
def regular_user(db):
    from django.contrib.auth import get_user_model

    return get_user_model().objects.create_user(
        username="ed_user", email="ed_user@x.com", password="Pass123!", role="USER"
    )


@pytest.fixture
def tag(db):
    from customer.models import Tag

    return Tag.objects.create(tag_name="Etiket D")


@pytest.fixture
def customer(db, admin_user, regular_user, tag):
    from customer.models import Customer

    return Customer.objects.create(
        customer_name="Ad",
        customer_surname="Soyad",
        customer_phone="05559998877",
        tag=tag,
        assigned_to=regular_user,
        created_by=admin_user,
    )


@pytest.fixture
def product(db):
    from products.models import Product

    return Product.objects.create(name="Ürün D")


def _make_appointment(customer, product, created_by):
    from events.models import Appointment

    return Appointment.objects.create(
        name="Randevu D",
        scheduled_for=timezone.now(),
        appointment_type="muayene",
        customer=customer,
        product=product,
        created_by=created_by,
        status="beklemede",
    )


def test_appointment_deleted_by_user_notifies_admins(
    regular_user, admin_user, customer, product
):
    appt = _make_appointment(customer, product, created_by=regular_user)
    Notification.objects.all().delete()
    appt.delete()
    assert Notification.objects.filter(
        recipient=admin_user, type_key="events.appointment_deleted"
    ).exists()


def test_appointment_deleted_by_admin_notifies_assigned_to(
    admin_user, regular_user, customer, product
):
    appt = _make_appointment(customer, product, created_by=admin_user)
    Notification.objects.all().delete()
    appt.delete()
    assert Notification.objects.filter(
        recipient=regular_user, type_key="events.appointment_deleted"
    ).exists()
