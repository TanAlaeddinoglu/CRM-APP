"""E-posta kanalı: asenkron gönderim + boş e-posta guard testleri."""
from unittest import mock

import pytest

from notifications.channels.email import EmailChannel


pytestmark = pytest.mark.django_db(transaction=True)


@pytest.fixture
def user_with_email(db):
    from django.contrib.auth import get_user_model

    return get_user_model().objects.create_user(
        username="mail_user", email="mail_user@example.com", password="Pass123!"
    )


@pytest.fixture
def user_without_email(db):
    from django.contrib.auth import get_user_model

    return get_user_model().objects.create_user(
        username="no_mail_user", email="", password="Pass123!"
    )


# ── EmailChannel.send → task kuyruğa atıyor mu ────────────────────────────


def test_channel_enqueues_email_task(user_with_email):
    with mock.patch("notifications.tasks.send_notification_email_task.delay") as delay:
        EmailChannel().send(None, user_with_email, "Başlık", "Gövde", {}, None)
    delay.assert_called_once_with(user_with_email.pk, "Başlık", "Gövde")


def test_channel_skips_recipient_without_email(user_without_email):
    with mock.patch("notifications.tasks.send_notification_email_task.delay") as delay:
        EmailChannel().send(None, user_without_email, "Başlık", "Gövde", {}, None)
    delay.assert_not_called()


# ── send_notification_email_task → mail servisini çağırıyor mu ────────────


def test_task_calls_mail_service(user_with_email):
    from notifications.tasks import send_notification_email_task

    with mock.patch("notifications.mail.services.send_email_notification") as send_mail:
        # ALWAYS_EAGER (settings_test) → senkron çalışır
        send_notification_email_task.delay(user_with_email.pk, "Konu", "İçerik")

    send_mail.assert_called_once_with(
        subject="Konu", body="İçerik", to_emails=[user_with_email.email]
    )


def test_task_skips_user_without_email(user_without_email):
    from notifications.tasks import send_notification_email_task

    with mock.patch("notifications.mail.services.send_email_notification") as send_mail:
        send_notification_email_task.delay(user_without_email.pk, "Konu", "İçerik")

    send_mail.assert_not_called()


# ── Uçtan uca: email kanallı kural → mail servisi ─────────────────────────


def test_dispatch_with_email_rule_sends_mail(user_with_email):
    import events.notifications.notification_types  # noqa: registry'yi doldur
    from notifications.models import NotificationRule
    from notifications.services.dispatcher import NotificationDispatchService

    NotificationRule.objects.create(
        type_key="events.appointment_created",
        name="E-posta kuralı",
        channels=["email"],
        is_active=True,
        is_system_default=False,
    )

    with mock.patch("notifications.mail.services.send_email_notification") as send_mail:
        NotificationDispatchService().dispatch(
            "events.appointment_created",
            {"appointment_name": "Test"},
            [user_with_email.pk],
            None,
            None,
        )

    send_mail.assert_called_once()
    _, kwargs = send_mail.call_args
    assert kwargs["to_emails"] == [user_with_email.email]
