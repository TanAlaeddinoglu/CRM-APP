import pytest
from django.core import mail
from django.core.exceptions import ImproperlyConfigured
from rest_framework import status

from common.secrets.exceptions import SecretNotFoundError
from common.secrets.factory import get_secret_store
from notifications.models import (
    EmailLog,
    MailConfiguration,
    MailConfigurationTestSession,
)


pytestmark = pytest.mark.django_db


def teardown_function():
    get_secret_store.cache_clear()


def _payload(**overrides):
    data = {
        "name": "Primary SMTP",
        "host": "smtp.example.com",
        "port": 587,
        "host_user": "mailer@example.com",
        "host_password": "super-secret-password",
        "default_from_email": "crm@example.com",
        "use_tls": True,
        "use_ssl": False,
    }
    data.update(overrides)
    return data


def test_mail_configuration_test_view_sends_test_email_and_creates_session(
    admin_client,
    admin_user,
):
    response = admin_client.post(
        "/api/notifications/email-settings/test/",
        _payload(),
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data["test_session_id"]
    assert response.data["email_log"]["delivery_type"] == EmailLog.DeliveryType.TEST
    assert response.data["email_log"]["status"] == EmailLog.Status.SENT
    assert MailConfigurationTestSession.objects.count() == 1
    assert MailConfiguration.objects.count() == 0
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == [admin_user.email]


def test_mail_configuration_save_view_requires_matching_test_session(admin_client):
    response = admin_client.put(
        "/api/notifications/email-settings/",
        {
            **_payload(),
            "test_session_id": 9999,
        },
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert MailConfiguration.objects.count() == 0


def test_mail_configuration_save_view_persists_db_and_secrets(admin_client):
    test_response = admin_client.post(
        "/api/notifications/email-settings/test/",
        _payload(),
        format="json",
    )

    save_response = admin_client.put(
        "/api/notifications/email-settings/",
        {
            **_payload(),
            "test_session_id": test_response.data["test_session_id"],
        },
        format="json",
    )

    assert save_response.status_code == status.HTTP_200_OK
    assert MailConfiguration.objects.count() == 1

    config = MailConfiguration.objects.get()
    store = get_secret_store()

    assert config.host == "smtp.example.com"
    assert config.last_test_status == MailConfiguration.TestStatus.PASSED
    assert store.get_secret(config.username_secret_name) == "mailer@example.com"
    assert store.get_secret(config.password_secret_name) == "super-secret-password"


def test_mail_configuration_save_view_rejects_changed_payload_after_test(admin_client):
    test_response = admin_client.post(
        "/api/notifications/email-settings/test/",
        _payload(),
        format="json",
    )

    response = admin_client.put(
        "/api/notifications/email-settings/",
        {
            **_payload(host="smtp.changed.example.com"),
            "test_session_id": test_response.data["test_session_id"],
        },
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert MailConfiguration.objects.count() == 0


def test_mail_configuration_test_view_creates_failed_session_on_delivery_error(
    admin_client,
    monkeypatch,
):
    def _fail_send(self, fail_silently=False):
        raise ImproperlyConfigured("SMTP test failed")

    monkeypatch.setattr("django.core.mail.EmailMessage.send", _fail_send)

    response = admin_client.post(
        "/api/notifications/email-settings/test/",
        _payload(),
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert MailConfigurationTestSession.objects.count() == 1
    assert MailConfigurationTestSession.objects.get().status == (
        MailConfigurationTestSession.Status.FAILED
    )
    assert EmailLog.objects.get().status == EmailLog.Status.FAILED


def test_mail_configuration_save_view_rotates_secret_names(admin_client, regular_user):
    store = get_secret_store()
    old_username_secret = store.set_secret("old-user-secret", "old-user@example.com")
    old_password_secret = store.set_secret("old-password-secret", "old-password")
    MailConfiguration.objects.create(
        name="Existing SMTP",
        host="smtp.old.example.com",
        port=587,
        use_tls=True,
        use_ssl=False,
        default_from_email="old@example.com",
        username_secret_name=old_username_secret,
        password_secret_name=old_password_secret,
        is_active=True,
        last_test_status=MailConfiguration.TestStatus.PASSED,
        created_by=regular_user,
        updated_by=regular_user,
    )

    test_response = admin_client.post(
        "/api/notifications/email-settings/test/",
        _payload(host="smtp.new.example.com"),
        format="json",
    )

    save_response = admin_client.put(
        "/api/notifications/email-settings/",
        {
            **_payload(host="smtp.new.example.com"),
            "test_session_id": test_response.data["test_session_id"],
        },
        format="json",
    )

    assert save_response.status_code == status.HTTP_200_OK

    config = MailConfiguration.objects.get()
    assert config.username_secret_name != old_username_secret
    assert config.password_secret_name != old_password_secret

    with pytest.raises(SecretNotFoundError):
        store.get_secret(old_username_secret)

    with pytest.raises(SecretNotFoundError):
        store.get_secret(old_password_secret)


def test_mail_configuration_delete_view_removes_active_configuration_and_secrets(
    admin_client,
    regular_user,
):
    store = get_secret_store()
    username_secret = store.set_secret("delete-user-secret", "delete-user@example.com")
    password_secret = store.set_secret("delete-password-secret", "delete-password")
    MailConfiguration.objects.create(
        name="Delete SMTP",
        host="smtp.delete.example.com",
        port=587,
        use_tls=True,
        use_ssl=False,
        default_from_email="delete@example.com",
        username_secret_name=username_secret,
        password_secret_name=password_secret,
        is_active=True,
        last_test_status=MailConfiguration.TestStatus.PASSED,
        created_by=regular_user,
        updated_by=regular_user,
    )

    response = admin_client.delete("/api/notifications/email-settings/")

    assert response.status_code == status.HTTP_200_OK
    assert MailConfiguration.objects.count() == 0

    with pytest.raises(SecretNotFoundError):
        store.get_secret(username_secret)

    with pytest.raises(SecretNotFoundError):
        store.get_secret(password_secret)


def test_mail_configuration_delete_view_reports_secret_store_failures(
    admin_client,
    regular_user,
    monkeypatch,
):
    store = get_secret_store()
    username_secret = store.set_secret(
        "delete-user-secret-2", "delete-user@example.com"
    )
    password_secret = store.set_secret("delete-password-secret-2", "delete-password")
    MailConfiguration.objects.create(
        name="Delete SMTP",
        host="smtp.delete.example.com",
        port=587,
        use_tls=True,
        use_ssl=False,
        default_from_email="delete@example.com",
        username_secret_name=username_secret,
        password_secret_name=password_secret,
        is_active=True,
        last_test_status=MailConfiguration.TestStatus.PASSED,
        created_by=regular_user,
        updated_by=regular_user,
    )

    def _fail_delete(name):
        raise RuntimeError(f"delete failed for {name}")

    monkeypatch.setattr(store, "delete_secret", _fail_delete)

    response = admin_client.delete("/api/notifications/email-settings/")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Mail configuration could not be deleted" in response.data["detail"]
