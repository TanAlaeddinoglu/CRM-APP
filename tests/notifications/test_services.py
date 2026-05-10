import pytest
from django.core import mail
from django.core.exceptions import ImproperlyConfigured
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

from notifications.exceptions import EmailDeliveryError
from notifications.models import EmailLog
from notifications.services import send_email_notification


pytestmark = pytest.mark.django_db


def test_send_email_notification_sends_and_persists_metadata(regular_user):
    email_log = send_email_notification(
        subject="Welcome",
        body="Hello from CRM",
        to_emails=["customer@example.com"],
        cc_emails=["manager@example.com"],
        bcc_emails=["audit@example.com"],
        created_by=regular_user,
    )

    email_log.refresh_from_db()

    assert len(mail.outbox) == 1
    assert mail.outbox[0].subject == "Welcome"
    assert email_log.status == EmailLog.Status.SENT
    assert email_log.sent_at is not None
    assert email_log.metadata["sender_source"] == "default"
    assert email_log.metadata["resolved_from_email"]
    assert email_log.metadata["recipient_count"] == 1
    assert email_log.metadata["cc_count"] == 1
    assert email_log.metadata["bcc_count"] == 1
    assert email_log.metadata["created_by_id"] == regular_user.id
    assert email_log.created_by == regular_user


def test_send_email_notification_with_attachments_tracks_attachment_metadata(
    regular_user,
):
    attachment = SimpleUploadedFile(
        "invoice.txt",
        b"invoice-content",
        content_type="text/plain",
    )

    email_log = send_email_notification(
        subject="Invoice",
        body="Please find the invoice attached.",
        to_emails=["customer@example.com"],
        attachments=[attachment],
        created_by=regular_user,
    )

    email_log.refresh_from_db()

    assert len(mail.outbox) == 1
    assert len(mail.outbox[0].attachments) == 1
    assert mail.outbox[0].attachments[0][0] == "invoice.txt"
    assert email_log.status == EmailLog.Status.SENT
    assert email_log.metadata["attachment_count"] == 1
    assert email_log.metadata["attachments"][0]["name"] == "invoice.txt"


def test_send_email_notification_with_multiple_attachments_tracks_all_metadata(
    regular_user,
):
    attachments = [
        SimpleUploadedFile("first.txt", b"first", content_type="text/plain"),
        SimpleUploadedFile("second.csv", b"a,b", content_type="text/csv"),
    ]

    email_log = send_email_notification(
        subject="Many attachments",
        body="Hello",
        to_emails=["customer@example.com"],
        attachments=attachments,
        created_by=regular_user,
    )

    assert len(mail.outbox) == 1
    assert len(mail.outbox[0].attachments) == 2
    assert email_log.metadata["attachment_count"] == 2
    assert email_log.metadata["attachments"][0]["name"] == "first.txt"
    assert email_log.metadata["attachments"][1]["content_type"] == "text/csv"


def test_send_email_notification_uses_explicit_from_email_when_provided(regular_user):
    email_log = send_email_notification(
        subject="Custom sender",
        body="Hello",
        to_emails=["customer@example.com"],
        from_email="support@example.com",
        created_by=regular_user,
    )

    assert len(mail.outbox) == 1
    assert mail.outbox[0].from_email == "support@example.com"
    assert email_log.from_email == "support@example.com"
    assert email_log.metadata["sender_source"] == "request"
    assert email_log.metadata["resolved_from_email"] == "support@example.com"


@override_settings(DEFAULT_FROM_EMAIL="default-sender@example.com")
def test_send_email_notification_uses_default_sender_and_supports_no_creator():
    email_log = send_email_notification(
        subject="Default sender",
        body="Hello",
        to_emails=["customer@example.com"],
    )

    assert len(mail.outbox) == 1
    assert mail.outbox[0].from_email == "default-sender@example.com"
    assert email_log.from_email == "default-sender@example.com"
    assert email_log.created_by is None
    assert email_log.metadata["sender_source"] == "default"
    assert email_log.metadata["created_by_id"] is None
    assert email_log.metadata["created_by_username"] is None


def test_send_email_notification_marks_failed_delivery_without_losing_log(
    regular_user, monkeypatch
):
    def _fail_send(self, fail_silently=False):
        raise ImproperlyConfigured("SMTP credentials rejected")

    monkeypatch.setattr("django.core.mail.EmailMessage.send", _fail_send)

    with pytest.raises(EmailDeliveryError) as exc_info:
        send_email_notification(
            subject="Welcome",
            body="Hello from CRM",
            to_emails=["customer@example.com"],
            created_by=regular_user,
        )

    email_log = exc_info.value.email_log
    email_log.refresh_from_db()

    assert email_log.status == EmailLog.Status.FAILED
    assert email_log.from_email
    assert email_log.error_message
    assert email_log.metadata["sender_source"] == "default"
    assert email_log.metadata["delivery_error"]["type"] == "ImproperlyConfigured"
    assert (
        email_log.metadata["delivery_error"]["message"] == "SMTP credentials rejected"
    )
