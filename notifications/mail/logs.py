from __future__ import annotations

from django.utils import timezone

from notifications.models import EmailLog


def mark_email_sent(email_log: EmailLog) -> EmailLog:
    email_log.status = EmailLog.Status.SENT
    email_log.sent_at = timezone.now()
    email_log.error_message = ""
    email_log.save(update_fields=["status", "sent_at", "error_message", "updated_at"])
    return email_log


def mark_email_failed(email_log: EmailLog, exc: Exception) -> EmailLog:
    email_log.status = EmailLog.Status.FAILED
    email_log.error_message = str(exc)
    email_log.metadata = {
        **email_log.metadata,
        "delivery_error": {
            "type": exc.__class__.__name__,
            "message": str(exc),
        },
    }
    email_log.save(update_fields=["status", "error_message", "metadata", "updated_at"])
    return email_log
