import pytest
from django.core import mail
from django.core.exceptions import ImproperlyConfigured
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from notifications.models import EmailLog


pytestmark = pytest.mark.django_db


def test_send_email_view_creates_email_log_and_sends_mail(admin_client, admin_user):
    response = admin_client.post(
        "/api/notifications/emails/",
        {
            "subject": "Appointment reminder",
            "body": "Your appointment is tomorrow at 10:00.",
            "to_emails": ["person@example.com"],
        },
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["status"] == EmailLog.Status.SENT
    assert response.data["created_by"] == admin_user.username
    assert response.data["metadata"]["sender_source"] == "default"
    assert EmailLog.objects.count() == 1
    assert len(mail.outbox) == 1


def test_send_email_view_accepts_attachment(admin_client):
    attachment = SimpleUploadedFile(
        "test.txt",
        b"hello-attachment",
        content_type="text/plain",
    )

    response = admin_client.post(
        "/api/notifications/emails/",
        {
            "subject": "Attachment mail",
            "body": "See attachment.",
            "to_email": "person@example.com",
            "attachment": attachment,
        },
        format="multipart",
    )

    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["status"] == EmailLog.Status.SENT
    assert response.data["metadata"]["attachments"][0]["name"] == "test.txt"
    assert len(mail.outbox) == 1
    assert len(mail.outbox[0].attachments) == 1


def test_send_email_view_returns_controlled_response_for_delivery_failures(
    admin_client, monkeypatch
):
    def _fail_send(self, fail_silently=False):
        raise ImproperlyConfigured("SMTP auth failed")

    monkeypatch.setattr("django.core.mail.EmailMessage.send", _fail_send)

    response = admin_client.post(
        "/api/notifications/emails/",
        {
            "subject": "Test",
            "body": "Body",
            "to_email": "person@example.com",
        },
        format="json",
    )

    assert response.status_code == status.HTTP_202_ACCEPTED
    assert response.data["email_log"]["status"] == EmailLog.Status.FAILED
    assert response.data["email_log"]["metadata"]["delivery_error"]["type"] == (
        "ImproperlyConfigured"
    )


def test_send_email_view_rejects_regular_users(regular_client):
    response = regular_client.post(
        "/api/notifications/emails/",
        {
            "subject": "Test",
            "body": "Body",
            "to_emails": ["person@example.com"],
        },
        format="json",
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert EmailLog.objects.count() == 0
    assert len(mail.outbox) == 0


def test_send_email_view_requires_authenticated_user(api_client):
    response = api_client.post(
        "/api/notifications/emails/",
        {
            "subject": "Test",
            "body": "Body",
            "to_emails": ["person@example.com"],
        },
        format="json",
    )

    assert response.status_code in {
        status.HTTP_401_UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN,
    }
