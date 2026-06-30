"""
Events sinyali testleri — transaction=True gerekiyor (on_commit için).
CELERY_TASK_ALWAYS_EAGER=True settings_test.py'de zaten tanımlı.
"""
import pytest
from django.utils import timezone

from notifications.models import Notification, NotificationRule


pytestmark = pytest.mark.django_db(transaction=True)


@pytest.fixture(autouse=True)
def default_rule(db):
    """Dispatcher'ın işleyebilmesi için aktif kural şart."""
    return NotificationRule.objects.get_or_create(
        type_key="events.appointment_created",
        is_system_default=True,
        defaults={
            "name": "Randevu oluşturuldu",
            "channels": ["in_app"],
            "is_active": True,
        },
    )[0]


@pytest.fixture(autouse=True)
def status_rule(db):
    return NotificationRule.objects.get_or_create(
        type_key="events.appointment_status_updated",
        is_system_default=True,
        defaults={
            "name": "Randevu durumu güncellendi",
            "channels": ["in_app"],
            "is_active": True,
        },
    )[0]


# ── Fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture
def admin_user(db):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return User.objects.create_user(
        username="admin_signal",
        email="admin_signal@example.com",
        password="Pass123!",
        role="ADMIN",
    )


@pytest.fixture
def regular_user(db):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return User.objects.create_user(
        username="user_signal",
        email="user_signal@example.com",
        password="Pass123!",
        role="USER",
    )


@pytest.fixture
def tag(db):
    from customer.models import Tag

    return Tag.objects.create(tag_name="Test Tag")


@pytest.fixture
def customer(db, admin_user, regular_user, tag):
    from customer.models import Customer

    return Customer.objects.create(
        customer_name="Test",
        customer_surname="Müşteri",
        customer_phone="05551234567",
        tag=tag,
        assigned_to=regular_user,
        created_by=admin_user,
    )


@pytest.fixture
def product(db, admin_user):
    from products.models import Product

    return Product.objects.create(
        name="Test Ürün",
        created_by=admin_user,
    )


def make_appointment(customer, product, created_by, status="beklemede"):
    from events.models import Appointment

    return Appointment.objects.create(
        name="Test Randevu",
        scheduled_for=timezone.now(),
        appointment_type="muayene",
        customer=customer,
        product=product,
        created_by=created_by,
        status=status,
    )


# ── appointment_created ───────────────────────────────────────────────────────


def test_appointment_created_by_user_notifies_admins(
    regular_user, admin_user, customer, product
):
    make_appointment(customer, product, created_by=regular_user)
    assert Notification.objects.filter(
        recipient=admin_user,
        type_key="events.appointment_created",
    ).exists()


def test_appointment_created_by_admin_notifies_assigned_to(
    admin_user, regular_user, customer, product
):
    # customer.assigned_to = regular_user (fixture'da set edildi)
    make_appointment(customer, product, created_by=admin_user)
    assert Notification.objects.filter(
        recipient=regular_user,
        type_key="events.appointment_created",
    ).exists()


def test_appointment_created_no_creator_no_notification(customer, product):
    make_appointment(customer, product, created_by=None)
    assert (
        Notification.objects.filter(type_key="events.appointment_created").count() == 0
    )


def test_appointment_created_admin_no_assigned_to_no_notification(
    admin_user, tag, product, db
):
    from customer.models import Customer

    customer_no_assigned = Customer.objects.create(
        customer_name="Atanmamış",
        customer_surname="Müşteri",
        customer_phone="05559876543",
        tag=tag,
        assigned_to=None,
        created_by=admin_user,
    )
    make_appointment(customer_no_assigned, product, created_by=admin_user)
    assert (
        Notification.objects.filter(type_key="events.appointment_created").count() == 0
    )


# ── appointment_status_updated ────────────────────────────────────────────────


def test_appointment_status_change_by_user_notifies_admins(
    regular_user, admin_user, customer, product
):
    appointment = make_appointment(customer, product, created_by=regular_user)
    Notification.objects.all().delete()  # created bildirimlerini temizle

    appointment.status = "satis"
    appointment.updated_by = regular_user
    appointment.save()

    assert Notification.objects.filter(
        type_key="events.appointment_status_updated",
        recipient=admin_user,
    ).exists()


def test_appointment_status_change_by_admin_notifies_assigned_to(
    admin_user, regular_user, customer, product
):
    # customer.assigned_to = regular_user (fixture'da set edildi)
    appointment = make_appointment(customer, product, created_by=admin_user)
    Notification.objects.all().delete()

    appointment.status = "satis"
    appointment.updated_by = admin_user
    appointment.save()

    assert Notification.objects.filter(
        type_key="events.appointment_status_updated",
        recipient=regular_user,
    ).exists()


def test_appointment_status_unchanged_no_notification(regular_user, customer, product):
    appointment = make_appointment(customer, product, created_by=regular_user)
    Notification.objects.all().delete()

    # Status değişmeden save
    appointment.notes = "Not eklendi"
    appointment.updated_by = regular_user
    appointment.save()

    assert (
        Notification.objects.filter(
            type_key="events.appointment_status_updated"
        ).count()
        == 0
    )


def test_appointment_created_does_not_trigger_status_notification(
    regular_user, customer, product
):
    make_appointment(customer, product, created_by=regular_user)
    assert (
        Notification.objects.filter(
            type_key="events.appointment_status_updated"
        ).count()
        == 0
    )
