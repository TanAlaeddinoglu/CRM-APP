"""
Customer + Tag bildirim sinyali testleri.
transaction=True (on_commit), CELERY_TASK_ALWAYS_EAGER settings_test'te tanımlı.
"""
import pytest

import customer.notifications.notification_types  # noqa: registry'yi doldur
from notifications.models import Notification, NotificationRule


pytestmark = pytest.mark.django_db(transaction=True)


@pytest.fixture(autouse=True)
def rules(db):
    for key, name in [
        ("customer.customer_created", "Müşteri oluşturuldu"),
        ("customer.customer_assigned", "Müşteri atandı"),
        ("tags.tag_created", "Etiket oluşturuldu"),
        ("tags.tag_updated", "Etiket güncellendi"),
        ("tags.tag_deleted", "Etiket silindi"),
    ]:
        NotificationRule.objects.get_or_create(
            type_key=key,
            is_system_default=True,
            defaults={"name": name, "channels": ["in_app"], "is_active": True},
        )


@pytest.fixture
def admin_user(db):
    from django.contrib.auth import get_user_model

    return get_user_model().objects.create_user(
        username="c_admin", email="c_admin@x.com", password="Pass123!", role="ADMIN"
    )


@pytest.fixture
def regular_user(db):
    from django.contrib.auth import get_user_model

    return get_user_model().objects.create_user(
        username="c_user", email="c_user@x.com", password="Pass123!", role="USER"
    )


@pytest.fixture
def tag(db):
    from customer.models import Tag

    return Tag.objects.create(tag_name="Etiket A")


def _make_customer(tag, created_by, assigned_to=None):
    from customer.models import Customer

    return Customer.objects.create(
        customer_name="Ad",
        customer_surname="Soyad",
        customer_phone="05551112233",
        tag=tag,
        created_by=created_by,
        updated_by=created_by,
        assigned_to=assigned_to,
    )


# ── customer_created ──────────────────────────────────────────────────────


def test_customer_created_by_user_notifies_admins(regular_user, admin_user, tag):
    Notification.objects.all().delete()
    _make_customer(tag, created_by=regular_user)
    assert Notification.objects.filter(
        recipient=admin_user, type_key="customer.customer_created"
    ).exists()


def test_customer_created_by_admin_no_notification(admin_user, tag):
    Notification.objects.all().delete()
    _make_customer(tag, created_by=admin_user)
    assert (
        Notification.objects.filter(type_key="customer.customer_created").count() == 0
    )


# ── customer_assigned ─────────────────────────────────────────────────────


def test_customer_assigned_by_admin_notifies_assignee(admin_user, regular_user, tag):
    cust = _make_customer(tag, created_by=admin_user, assigned_to=None)
    Notification.objects.all().delete()

    cust.assigned_to = regular_user
    cust.updated_by = admin_user
    cust.save()

    assert Notification.objects.filter(
        recipient=regular_user, type_key="customer.customer_assigned"
    ).exists()


def test_customer_assignment_unchanged_no_notification(admin_user, regular_user, tag):
    cust = _make_customer(tag, created_by=admin_user, assigned_to=regular_user)
    Notification.objects.all().delete()

    cust.customer_name = "Yeni Ad"
    cust.updated_by = admin_user
    cust.save()

    assert (
        Notification.objects.filter(type_key="customer.customer_assigned").count() == 0
    )


# ── tags ──────────────────────────────────────────────────────────────────


def test_tag_created_notifies_admins(admin_user):
    from customer.models import Tag

    Notification.objects.all().delete()
    Tag.objects.create(tag_name="Yeni Etiket")
    assert Notification.objects.filter(
        recipient=admin_user, type_key="tags.tag_created"
    ).exists()


def test_tag_updated_notifies_admins(admin_user, tag):
    Notification.objects.all().delete()
    tag.description = "guncel"
    tag.save()
    assert Notification.objects.filter(
        recipient=admin_user, type_key="tags.tag_updated"
    ).exists()


def test_tag_deleted_notifies_admins(admin_user, tag):
    Notification.objects.all().delete()
    tag.delete()
    assert Notification.objects.filter(
        recipient=admin_user, type_key="tags.tag_deleted"
    ).exists()
