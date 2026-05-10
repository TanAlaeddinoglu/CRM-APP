from django.conf import settings
from django.core.mail import EmailMessage
from django.db import transaction
from django.utils import timezone

from .exceptions import EmailDeliveryError
from .models import EmailLog


def _prepare_attachment_metadata(attachments):
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


def _build_email_metadata(
    *,
    created_by=None,
    provided_from_email=None,
    resolved_from_email="",
    to_emails=None,
    cc_emails=None,
    bcc_emails=None,
    attachments=None,
):
    return {
        "sender_source": "request" if provided_from_email else "default",
        "resolved_from_email": resolved_from_email,
        "recipient_count": len(to_emails or []),
        "cc_count": len(cc_emails or []),
        "bcc_count": len(bcc_emails or []),
        "attachment_count": len(attachments or []),
        "attachments": _prepare_attachment_metadata(attachments or []),
        "created_by_id": getattr(created_by, "id", None),
        "created_by_username": getattr(created_by, "username", None),
    }


def _mark_email_sent(email_log):
    email_log.status = EmailLog.Status.SENT
    email_log.sent_at = timezone.now()
    email_log.error_message = ""
    email_log.save(update_fields=["status", "sent_at", "error_message", "updated_at"])
    return email_log


def _mark_email_failed(email_log, exc):
    email_log.status = EmailLog.Status.FAILED
    email_log.error_message = exc
    email_log.metadata = {
        **email_log.metadata,
        "delivery_error": {
            "type": exc.__class__.__name__,
            "message": str(exc),
        },
    }
    email_log.save(update_fields=["status", "error_message", "metadata", "updated_at"])
    return email_log


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
):
    cc_emails = cc_emails or []
    bcc_emails = bcc_emails or []
    attachments = attachments or []
    resolved_from_email = from_email or getattr(settings, "SERVER_EMAIL")
    metadata = _build_email_metadata(
        created_by=created_by,
        provided_from_email=from_email,
        resolved_from_email=resolved_from_email,
        to_emails=to_emails,
        cc_emails=cc_emails,
        bcc_emails=bcc_emails,
        attachments=attachments,
    )

    email_log = EmailLog.objects.create(
        subject=subject,
        body=body,
        from_email=resolved_from_email,
        to_emails=to_emails,
        cc_emails=cc_emails,
        bcc_emails=bcc_emails,
        metadata=metadata,
        created_by=created_by,
        status=EmailLog.Status.PENDING,
    )

    message = EmailMessage(
        subject=subject,
        body=body,
        from_email=resolved_from_email,
        to=to_emails,
        cc=cc_emails,
        bcc=bcc_emails,
    )
    for attachment in attachments:
        message.attach(
            attachment.name,
            attachment.read(),
            getattr(attachment, "content_type", "application/octet-stream"),
        )

    try:
        with transaction.atomic():
            message.send(fail_silently=False)
            return _mark_email_sent(email_log)
    except Exception as exc:
        failed_log = _mark_email_failed(email_log, exc)
        raise EmailDeliveryError(failed_log) from exc
