import pytest
from django.core import mail
from django.core.exceptions import ImproperlyConfigured
from django.core.files.uploadedfile import SimpleUploadedFile

from common.secrets.factory import get_secret_store
from notifications.exceptions import EmailDeliveryError
from notifications.models import EmailLog, MailConfiguration
from notifications.mail.services import send_email_notification


pytestmark = pytest.mark.django_db


def teardown_function():
    get_secret_store.cache_clear()


def test_send_email_notification_sends_and_persists_metadata(
    regular_user, active_mail_configuration
):
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
    active_mail_configuration,
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
    active_mail_configuration,
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


def test_send_email_notification_uses_explicit_from_email_when_provided(
    regular_user, active_mail_configuration
):
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


def test_send_email_notification_uses_default_sender_and_supports_no_creator(
    active_mail_configuration,
):
    email_log = send_email_notification(
        subject="Default sender",
        body="Hello",
        to_emails=["customer@example.com"],
    )

    assert len(mail.outbox) == 1
    assert mail.outbox[0].from_email == "crm@example.com"
    assert email_log.from_email == "crm@example.com"
    assert email_log.created_by is None
    assert email_log.metadata["sender_source"] == "default"
    assert email_log.metadata["created_by_id"] is None
    assert email_log.metadata["created_by_username"] is None


def test_send_email_notification_marks_failed_delivery_without_losing_log(
    regular_user, active_mail_configuration, monkeypatch
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


def test_send_email_notification_uses_active_mail_configuration_from_database(
    regular_user,
):
    store = get_secret_store()
    username_secret_name = store.set_secret("mail-user", "db-user@example.com")
    password_secret_name = store.set_secret("mail-password", "db-password")
    mail_configuration = MailConfiguration.objects.create(
        name="Primary SMTP",
        host="smtp.db.example.com",
        port=2525,
        use_tls=True,
        use_ssl=False,
        default_from_email="db-default@example.com",
        username_secret_name=username_secret_name,
        password_secret_name=password_secret_name,
        is_active=True,
        last_test_status=MailConfiguration.TestStatus.PASSED,
        created_by=regular_user,
        updated_by=regular_user,
    )

    email_log = send_email_notification(
        subject="Configured sender",
        body="Hello",
        to_emails=["customer@example.com"],
        created_by=regular_user,
    )

    assert len(mail.outbox) == 1
    assert mail.outbox[0].from_email == "db-default@example.com"
    assert email_log.mail_configuration == mail_configuration
    assert email_log.metadata["mail_configuration"]["source"] == "database"
    assert email_log.metadata["mail_configuration"]["host"] == "smtp.db.example.com"


def test_send_email_notification_respects_manual_delivery_type(
    regular_user, active_mail_configuration
):
    email_log = send_email_notification(
        subject="Manual",
        body="Hello",
        to_emails=["customer@example.com"],
        created_by=regular_user,
        delivery_type=EmailLog.DeliveryType.MANUAL,
    )

    assert email_log.delivery_type == EmailLog.DeliveryType.MANUAL


def test_send_email_notification_logs_configuration_resolution_failures(regular_user):
    MailConfiguration.objects.create(
        name="Broken SMTP",
        host="smtp.db.example.com",
        port=2525,
        use_tls=True,
        use_ssl=False,
        default_from_email="db-default@example.com",
        username_secret_name="missing-user",
        password_secret_name="missing-password",
        is_active=True,
        last_test_status=MailConfiguration.TestStatus.PASSED,
        created_by=regular_user,
        updated_by=regular_user,
    )

    with pytest.raises(EmailDeliveryError) as exc_info:
        send_email_notification(
            subject="Broken config",
            body="Hello",
            to_emails=["customer@example.com"],
            created_by=regular_user,
        )

    email_log = exc_info.value.email_log
    assert email_log.status == EmailLog.Status.FAILED
    assert email_log.mail_configuration is not None
    assert email_log.metadata["mail_configuration_resolution"]["source"] == "database"
    assert email_log.metadata["mail_configuration_resolution"]["error_type"]


def test_send_email_notification_fails_without_active_mail_configuration(
    regular_user,
):
    with pytest.raises(EmailDeliveryError) as exc_info:
        send_email_notification(
            subject="Missing config",
            body="Hello",
            to_emails=["customer@example.com"],
            created_by=regular_user,
        )

    email_log = exc_info.value.email_log
    assert email_log.status == EmailLog.Status.FAILED
    assert email_log.mail_configuration is None
    assert email_log.metadata["mail_configuration_resolution"]["source"] == (
        "missing_configuration"
    )
    assert "No active mail configuration found" in email_log.error_message
