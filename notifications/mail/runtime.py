from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.mail import EmailMessage, get_connection
from django.db import transaction

from common.secrets import get_secret_store
from notifications.exceptions import EmailDeliveryError
from notifications.mail.models import EmailLog, MailConfiguration

from .contracts import ResolvedMailConfiguration
from .logs import mark_email_failed, mark_email_sent
from .metadata import build_email_metadata, build_resolution_failure_metadata


class MailConfigurationResolver:
    def __init__(self, secret_store=None):
        self.secret_store = secret_store or get_secret_store()

    def resolve(self) -> ResolvedMailConfiguration:
        active_config = MailConfiguration.objects.filter(is_active=True).first()
        if not active_config:
            raise ImproperlyConfigured(
                "No active mail configuration found. Configure SMTP settings before sending email."
            )
        return ResolvedMailConfiguration(
            source="database",
            backend_path=getattr(
                settings,
                "EMAIL_BACKEND",
                "django.core.mail.backends.smtp.EmailBackend",
            ),
            host=active_config.host,
            port=active_config.port,
            host_user=self.secret_store.get_secret(active_config.username_secret_name),
            host_password=self.secret_store.get_secret(
                active_config.password_secret_name
            ),
            use_tls=active_config.use_tls,
            use_ssl=active_config.use_ssl,
            timeout=getattr(settings, "EMAIL_TIMEOUT", 10),
            default_from_email=active_config.default_from_email,
            mail_configuration=active_config,
        )


class SMTPConnectionFactory:
    def build(self, config: ResolvedMailConfiguration):
        return get_connection(
            backend=config.backend_path,
            host=config.host,
            port=config.port,
            username=config.host_user,
            password=config.host_password,
            use_tls=config.use_tls,
            use_ssl=config.use_ssl,
            timeout=config.timeout,
        )


def build_user_facing_error_message(exc: Exception) -> str:
    if isinstance(exc, ImproperlyConfigured):
        return str(exc)
    return f"Email delivery failed: {exc}"


class EmailDeliveryService:
    def __init__(self, resolver=None, connection_factory=None):
        self.resolver = resolver or MailConfigurationResolver()
        self.connection_factory = connection_factory or SMTPConnectionFactory()

    def send(
        self,
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
        cc_emails = cc_emails or []
        bcc_emails = bcc_emails or []
        attachments = attachments or []

        try:
            resolved_config = self.resolver.resolve()
        except Exception as exc:
            active_config = MailConfiguration.objects.filter(is_active=True).first()
            resolved_from_email = (
                from_email or getattr(active_config, "default_from_email", None) or ""
            )
            email_log = EmailLog.objects.create(
                subject=subject,
                body=body,
                from_email=resolved_from_email,
                to_emails=to_emails,
                cc_emails=cc_emails,
                bcc_emails=bcc_emails,
                metadata=build_resolution_failure_metadata(
                    created_by=created_by,
                    provided_from_email=from_email,
                    resolved_from_email=resolved_from_email,
                    to_emails=to_emails,
                    cc_emails=cc_emails,
                    bcc_emails=bcc_emails,
                    attachments=attachments,
                    active_config=active_config,
                    exc=exc,
                ),
                created_by=created_by,
                status=EmailLog.Status.FAILED,
                delivery_type=delivery_type,
                mail_configuration=active_config,
                error_message=str(exc),
            )
            raise EmailDeliveryError(
                email_log,
                user_message=build_user_facing_error_message(exc),
            ) from exc

        resolved_from_email = from_email or resolved_config.default_from_email
        email_log = EmailLog.objects.create(
            subject=subject,
            body=body,
            from_email=resolved_from_email,
            to_emails=to_emails,
            cc_emails=cc_emails,
            bcc_emails=bcc_emails,
            metadata=build_email_metadata(
                created_by=created_by,
                provided_from_email=from_email,
                resolved_from_email=resolved_from_email,
                to_emails=to_emails,
                cc_emails=cc_emails,
                bcc_emails=bcc_emails,
                attachments=attachments,
                resolved_config=resolved_config,
            ),
            created_by=created_by,
            status=EmailLog.Status.PENDING,
            delivery_type=delivery_type,
            mail_configuration=resolved_config.mail_configuration,
        )

        try:
            message = EmailMessage(
                subject=subject,
                body=body,
                from_email=resolved_from_email,
                to=to_emails,
                cc=cc_emails,
                bcc=bcc_emails,
                connection=self.connection_factory.build(resolved_config),
            )
            for attachment in attachments:
                message.attach(
                    attachment.name,
                    attachment.read(),
                    getattr(attachment, "content_type", "application/octet-stream"),
                )

            with transaction.atomic():
                message.send(fail_silently=False)
                return mark_email_sent(email_log)
        except Exception as exc:
            failed_log = mark_email_failed(email_log, exc)
            raise EmailDeliveryError(
                failed_log,
                user_message=build_user_facing_error_message(exc),
            ) from exc


__all__ = [
    "EmailDeliveryService",
    "MailConfigurationResolver",
    "SMTPConnectionFactory",
]
