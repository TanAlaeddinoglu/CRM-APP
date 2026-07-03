"""Kullanıcı giriş bildirim sinyali testleri (last_login değişimi)."""
import pytest
from django.utils import timezone

import accounts.notifications.notification_types  # noqa: registry'yi doldur
from notifications.models import Notification, NotificationRule


pytestmark = pytest.mark.django_db(transaction=True)


@pytest.fixture(autouse=True)
def rule(db):
    NotificationRule.objects.get_or_create(
        type_key="accounts.user_logged_in",
        is_system_default=True,
        defaults={
            "name": "Kullanıcı giriş yaptı",
            "channels": ["in_app"],
            "is_active": True,
        },
    )


@pytest.fixture
def admin_user(db):
    from django.contrib.auth import get_user_model

    return get_user_model().objects.create_user(
        username="a_admin", email="a_admin@x.com", password="Pass123!", role="ADMIN"
    )


@pytest.fixture
def regular_user(db):
    from django.contrib.auth import get_user_model

    return get_user_model().objects.create_user(
        username="a_user", email="a_user@x.com", password="Pass123!", role="USER"
    )


def test_user_login_notifies_admins(admin_user, regular_user):
    Notification.objects.all().delete()
    regular_user.last_login = timezone.now()
    regular_user.save(update_fields=["last_login"])
    assert Notification.objects.filter(
        recipient=admin_user, type_key="accounts.user_logged_in"
    ).exists()


def test_admin_login_no_notification(admin_user):
    Notification.objects.all().delete()
    admin_user.last_login = timezone.now()
    admin_user.save(update_fields=["last_login"])
    assert Notification.objects.filter(type_key="accounts.user_logged_in").count() == 0
