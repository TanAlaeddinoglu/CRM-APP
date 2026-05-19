from __future__ import annotations

import hashlib
import json
import uuid
from datetime import timedelta
from typing import cast

from django.conf import settings
from django.core.mail import EmailMessage, get_connection
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from common.secrets import get_secret_store
from notifications.models import (
    EmailLog,
    MailConfiguration,
    MailConfigurationTestSession,
)

from .contracts import MailConfigurationInput
from .logs import mark_email_failed, mark_email_sent
from .runtime import EmailDeliveryService


def build_config_fingerprint(config: MailConfigurationInput) -> str:
    payload = {
        "host": config.host,
        "port": config.port,
        "host_user": config.host_user,
        "host_password": config.host_password,
        "default_from_email": config.default_from_email,
        "use_tls": config.use_tls,
        "use_ssl": config.use_ssl,
        "name": config.name,
    }
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def get_active_mail_configuration() -> MailConfiguration | None:
    return cast(
        MailConfiguration | None,
        MailConfiguration.objects.filter(is_active=True).first(),
    )


def build_test_connection(config: MailConfigurationInput):
    return get_connection(
        backend=getattr(
            settings,
            "EMAIL_BACKEND",
            "django.core.mail.backends.smtp.EmailBackend",
        ),
        host=config.host,
        port=config.port,
        username=config.host_user,
        password=config.host_password,
        use_tls=config.use_tls,
        use_ssl=config.use_ssl,
        timeout=getattr(settings, "EMAIL_TIMEOUT", 10),
    )


def build_test_email_metadata(
    *,
    actor,
    recipient_email: str,
    config: MailConfigurationInput,
    fingerprint: str,
) -> dict:
    return {
        "sender_source": "mail_configuration_test",
        "resolved_from_email": config.default_from_email,
        "recipient_count": 1,
        "cc_count": 0,
        "bcc_count": 0,
        "attachment_count": 0,
        "attachments": [],
        "created_by_id": getattr(actor, "id", None),
        "created_by_username": getattr(actor, "username", None),
        "config_fingerprint": fingerprint,
        "config_preview": {
            "host": config.host,
            "port": config.port,
            "use_tls": config.use_tls,
            "use_ssl": config.use_ssl,
            "default_from_email": config.default_from_email,
            "name": config.name,
        },
        "test_recipient_email": recipient_email,
    }


def test_mail_configuration(
    *,
    config: MailConfigurationInput,
    tested_by,
    recipient_email: str,
) -> tuple[MailConfigurationTestSession, EmailLog]:
    fingerprint = build_config_fingerprint(config)
    metadata = build_test_email_metadata(
        actor=tested_by,
        recipient_email=recipient_email,
        config=config,
        fingerprint=fingerprint,
    )
    email_log = EmailLog.objects.create(
        subject="CRM Mail Configuration Test",
        body="This is a test email for verifying SMTP configuration.",
        from_email=config.default_from_email,
        to_emails=[recipient_email],
        metadata=metadata,
        created_by=tested_by,
        delivery_type=EmailLog.DeliveryType.TEST,
        status=EmailLog.Status.PENDING,
    )

    message = EmailMessage(
        subject=email_log.subject,
        body=email_log.body,
        from_email=config.default_from_email,
        to=[recipient_email],
        connection=build_test_connection(config),
    )

    try:
        message.send(fail_silently=False)
    except Exception as exc:
        failed_log = mark_email_failed(email_log, exc)
        failed_session = MailConfigurationTestSession.objects.create(
            tested_by=tested_by,
            config_fingerprint=fingerprint,
            status=MailConfigurationTestSession.Status.FAILED,
            recipient_email=recipient_email,
            expires_at=timezone.now(),
            metadata={
                **metadata,
                "delivery_error": {
                    "type": exc.__class__.__name__,
                    "message": str(exc),
                },
            },
        )
        failed_log.test_session = failed_session
        failed_log.save(update_fields=["test_session", "updated_at"])
        raise ValidationError(
            {"detail": f"Mail configuration test failed: {exc}"}
        ) from exc

    with transaction.atomic():
        email_log = mark_email_sent(email_log)
        test_session = MailConfigurationTestSession.objects.create(
            tested_by=tested_by,
            config_fingerprint=fingerprint,
            status=MailConfigurationTestSession.Status.PASSED,
            recipient_email=recipient_email,
            expires_at=timezone.now()
            + timedelta(
                seconds=getattr(settings, "MAIL_CONFIG_TEST_SESSION_TTL_SECONDS", 600)
            ),
            metadata=metadata,
        )
        email_log.test_session = test_session
        email_log.save(update_fields=["test_session", "updated_at"])
        return test_session, email_log


def validate_test_session(*, test_session_id: int, config: MailConfigurationInput):
    try:
        test_session = MailConfigurationTestSession.objects.get(pk=test_session_id)
    except MailConfigurationTestSession.DoesNotExist as exc:
        raise ValidationError({"test_session_id": ["Test session not found."]}) from exc

    if test_session.status != MailConfigurationTestSession.Status.PASSED:
        raise ValidationError({"test_session_id": ["Test session is not valid."]})

    if test_session.expires_at <= timezone.now():
        test_session.status = MailConfigurationTestSession.Status.EXPIRED
        test_session.save(update_fields=["status"])
        raise ValidationError({"test_session_id": ["Test session has expired."]})

    fingerprint = build_config_fingerprint(config)
    if test_session.config_fingerprint != fingerprint:
        raise ValidationError(
            {"test_session_id": ["Configuration changed after the successful test."]}
        )

    return test_session


def build_secret_name(kind: str) -> str:
    return f"djangocrm-mail-{kind}-{uuid.uuid4().hex}"


def save_mail_configuration(
    *,
    config: MailConfigurationInput,
    test_session_id: int,
    actor,
) -> MailConfiguration:
    test_session = validate_test_session(
        test_session_id=test_session_id,
        config=config,
    )
    secret_store = get_secret_store()
    existing_config = get_active_mail_configuration()
    username_secret_name = build_secret_name("username")
    password_secret_name = build_secret_name("password")
    old_secret_names = []
    if existing_config:
        old_secret_names = [
            existing_config.username_secret_name,
            existing_config.password_secret_name,
        ]

    secret_store.set_secret(username_secret_name, config.host_user)
    secret_store.set_secret(password_secret_name, config.host_password)

    try:
        with transaction.atomic():
            MailConfiguration.objects.exclude(
                pk=getattr(existing_config, "pk", None)
            ).filter(is_active=True).update(is_active=False)

            if existing_config:
                mail_configuration = existing_config
                if mail_configuration.created_by_id is None:
                    mail_configuration.created_by = actor
            else:
                mail_configuration = MailConfiguration(created_by=actor)

            mail_configuration.name = config.name
            mail_configuration.host = config.host
            mail_configuration.port = config.port
            mail_configuration.use_tls = config.use_tls
            mail_configuration.use_ssl = config.use_ssl
            mail_configuration.default_from_email = config.default_from_email
            mail_configuration.username_secret_name = username_secret_name
            mail_configuration.password_secret_name = password_secret_name
            mail_configuration.is_active = True
            mail_configuration.last_test_status = MailConfiguration.TestStatus.PASSED
            mail_configuration.last_test_at = test_session.created_at
            mail_configuration.last_test_recipient = test_session.recipient_email
            mail_configuration.updated_by = actor
            mail_configuration.save()

            test_session.mail_configuration = mail_configuration
            test_session.save(update_fields=["mail_configuration"])
    except Exception:
        secret_store.delete_secret(username_secret_name)
        secret_store.delete_secret(password_secret_name)
        raise

    for secret_name in old_secret_names:
        if secret_name and secret_name not in {
            username_secret_name,
            password_secret_name,
        }:
            try:
                secret_store.delete_secret(secret_name)
            except Exception:
                pass

    return mail_configuration


def delete_mail_configuration() -> None:
    mail_configuration = get_active_mail_configuration()
    if not mail_configuration:
        return

    secret_store = get_secret_store()
    for secret_name in (
        mail_configuration.username_secret_name,
        mail_configuration.password_secret_name,
    ):
        if secret_name:
            secret_store.delete_secret(secret_name)

    mail_configuration.delete()


def send_email_notification(
    *,
    subject,
    body,
    to_emails,
    created_by=None,
    from_email=None,
    cc_emails=None,
    bcc_emails=None,
    attachments=None,
    delivery_type=EmailLog.DeliveryType.SYSTEM,
):
    return EmailDeliveryService().send(
        subject=subject,
        body=body,
        to_emails=to_emails,
        created_by=created_by,
        from_email=from_email,
        cc_emails=cc_emails,
        bcc_emails=bcc_emails,
        attachments=attachments,
        delivery_type=delivery_type,
    )


__all__ = [
    "MailConfigurationInput",
    "build_config_fingerprint",
    "delete_mail_configuration",
    "get_active_mail_configuration",
    "save_mail_configuration",
    "send_email_notification",
    "test_mail_configuration",
    "validate_test_session",
]
