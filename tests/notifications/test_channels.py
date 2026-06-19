import pytest

from notifications.channels.in_app import InAppChannel
from notifications.channels.email import EmailChannel
from notifications.models import Notification, NotificationRule


pytestmark = pytest.mark.django_db


@pytest.fixture
def rule(db):
    return NotificationRule.objects.create(
        type_key="events.appointment_created",
        name="Test",
        channels=["in_app"],
        is_active=True,
        is_system_default=False,
    )


# ── InAppChannel ──────────────────────────────────────────────────────────────


def test_in_app_channel_creates_notification_record(rule, regular_user):
    InAppChannel().send(rule, regular_user, "Başlık", "Gövde", {}, None)
    assert Notification.objects.filter(recipient=regular_user).count() == 1


def test_in_app_channel_sets_correct_fields(rule, regular_user):
    InAppChannel().send(rule, regular_user, "Başlık", "Gövde", {"k": "v"}, None)
    n = Notification.objects.get(recipient=regular_user)
    assert n.title == "Başlık"
    assert n.body == "Gövde"
    assert n.context_payload == {"k": "v"}
    assert n.type_key == rule.type_key
    assert n.rule == rule
    assert not n.is_read


def test_in_app_channel_target_none_sets_null_fields(rule, regular_user):
    InAppChannel().send(rule, regular_user, "T", "B", {}, None)
    n = Notification.objects.get(recipient=regular_user)
    assert n.target_content_type is None
    assert n.target_object_id is None


def test_in_app_channel_sets_target_when_provided(rule, regular_user):
    from django.contrib.contenttypes.models import ContentType

    # Notification modeli kendisi bir target olarak kullanılabilir (herhangi bir model)
    dummy_notif = Notification.objects.create(
        recipient=regular_user,
        type_key="events.appointment_created",
        rule=rule,
        title="dummy",
        body="dummy",
        context_payload={},
    )
    InAppChannel().send(rule, regular_user, "T", "B", {}, dummy_notif)
    n = Notification.objects.filter(recipient=regular_user, title="T").first()
    assert n.target_content_type == ContentType.objects.get_for_model(dummy_notif)
    assert n.target_object_id == dummy_notif.pk


# ── EmailChannel ──────────────────────────────────────────────────────────────


def test_email_channel_calls_send_email_notification(rule, regular_user, monkeypatch):
    calls = []

    def mock_send(subject, body, to_emails, **kwargs):
        calls.append({"subject": subject, "to_emails": to_emails})

    monkeypatch.setattr(
        "notifications.mail.services.send_email_notification", mock_send
    )

    EmailChannel().send(rule, regular_user, "Konu", "İçerik", {}, None)

    assert len(calls) == 1
    assert calls[0]["subject"] == "Konu"
    assert regular_user.email in calls[0]["to_emails"]
