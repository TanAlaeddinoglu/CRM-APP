import logging

from djangoCRM.celery import app

logger = logging.getLogger(__name__)


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def dispatch_notification_task(
    self,
    event_key,
    payload,
    recipient_ids,
    content_type_id,
    object_id,
    channels=None,
    system_only=False,
    notification_rule_id=None,
):
    from notifications.services.dispatcher import NotificationDispatchService

    try:
        NotificationDispatchService().dispatch(
            event_key,
            payload,
            recipient_ids,
            content_type_id,
            object_id,
            channels,
            system_only,
            notification_rule_id,
        )
    except Exception as exc:
        raise self.retry(exc=exc)


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_notification_email_task(self, recipient_id, subject, body):
    """Bildirim e-postasını asenkron gönderir (in_app üretiminden bağımsız)."""
    from django.contrib.auth import get_user_model
    from notifications.exceptions import EmailDeliveryError
    from notifications.mail.services import send_email_notification

    user = get_user_model().objects.filter(pk=recipient_id).first()
    if not user or not user.email:
        return

    try:
        send_email_notification(subject=subject, body=body, to_emails=[user.email])
    except EmailDeliveryError as exc:
        raise self.retry(exc=exc)


@app.task(bind=True, max_retries=2, default_retry_delay=300)
def cleanup_expired_data(self):
    from notifications.services.retention import (
        RetentionService,
        build_default_policies,
    )

    try:
        stats = RetentionService().run_all(build_default_policies())
        logger.info("Retention cleanup tamamlandı: %s", stats)
        return stats
    except Exception as exc:
        raise self.retry(exc=exc)
