from __future__ import annotations

from django.conf import settings

from notifications.mail.models import MailConfiguration

from .contracts import ResolvedMailConfiguration


def prepare_attachment_metadata(attachments):
    return [
        {
            "name": attachment.name,
            "content_type": getattr(
                attachment,
                "content_type",
                "application/octet-stream",
            ),
            "size": getattr(attachment, "size", None),
        }
        for attachment in attachments
    ]


def build_email_metadata(
    *,
    created_by=None,
    provided_from_email=None,
    resolved_from_email="",
    to_emails=None,
    cc_emails=None,
    bcc_emails=None,
    attachments=None,
    resolved_config: ResolvedMailConfiguration | None = None,
):
    base_metadata = {
        "sender_source": "request" if provided_from_email else "default",
        "resolved_from_email": resolved_from_email,
        "recipient_count": len(to_emails or []),
        "cc_count": len(cc_emails or []),
        "bcc_count": len(bcc_emails or []),
        "attachment_count": len(attachments or []),
        "attachments": prepare_attachment_metadata(attachments or []),
        "created_by_id": getattr(created_by, "id", None),
        "created_by_username": getattr(created_by, "username", None),
    }

    if not resolved_config:
        return base_metadata

    base_metadata["mail_configuration"] = {
        "source": resolved_config.source,
        "backend_path": resolved_config.backend_path,
        "host": resolved_config.host,
        "port": resolved_config.port,
        "use_tls": resolved_config.use_tls,
        "use_ssl": resolved_config.use_ssl,
        "mail_configuration_id": getattr(
            resolved_config.mail_configuration,
            "id",
            None,
        ),
        "mail_configuration_name": getattr(
            resolved_config.mail_configuration,
            "name",
            None,
        ),
        "secret_backend": getattr(settings, "SECRET_STORE_BACKEND", None),
    }
    return base_metadata


def build_resolution_failure_metadata(
    *,
    created_by=None,
    provided_from_email=None,
    resolved_from_email="",
    to_emails=None,
    cc_emails=None,
    bcc_emails=None,
    attachments=None,
    active_config: MailConfiguration | None = None,
    exc: Exception | None = None,
):
    metadata = build_email_metadata(
        created_by=created_by,
        provided_from_email=provided_from_email,
        resolved_from_email=resolved_from_email,
        to_emails=to_emails,
        cc_emails=cc_emails,
        bcc_emails=bcc_emails,
        attachments=attachments,
        resolved_config=None,
    )
    metadata["mail_configuration_resolution"] = {
        "source": "database" if active_config else "missing_configuration",
        "mail_configuration_id": getattr(active_config, "id", None),
        "mail_configuration_name": getattr(active_config, "name", None),
        "error_type": exc.__class__.__name__ if exc else None,
        "error_message": str(exc) if exc else None,
    }
    return metadata
