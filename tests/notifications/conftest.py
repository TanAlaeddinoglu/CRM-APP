import pytest
from django.contrib.auth import get_user_model

from notifications.models import Notification, NotificationRule


@pytest.fixture(autouse=True, scope="session")
def ensure_notification_types_registered():
    """
    events.notification_types modülünü yükler; böylece registry testler boyunca dolu kalır.
    Apps.ready() test ortamında çalışmayabilir — bunu güvence altına alır.
    """
    import events.notifications.notification_types  # noqa


User = get_user_model()

TYPE_KEY = "events.appointment_created"


@pytest.fixture
def notification_type_key():
    return TYPE_KEY


@pytest.fixture
def active_rule(db):
    return NotificationRule.objects.create(
        type_key=TYPE_KEY,
        name="Test kuralı",
        channels=["in_app"],
        is_active=True,
        is_system_default=False,
    )


@pytest.fixture
def system_rule(db):
    return NotificationRule.objects.create(
        type_key=TYPE_KEY,
        name="Randevu oluşturuldu",
        channels=["in_app"],
        is_active=True,
        is_system_default=True,
    )


@pytest.fixture
def notification(db, regular_user, active_rule):
    return Notification.objects.create(
        recipient=regular_user,
        type_key=TYPE_KEY,
        rule=active_rule,
        title="Test bildirimi",
        body="Test gövdesi",
        context_payload={},
    )


@pytest.fixture
def second_user(db):
    return User.objects.create_user(
        username="user2",
        email="user2@example.com",
        password="User2Pass123!",
    )
