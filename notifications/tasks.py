from djangoCRM.celery import app


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def dispatch_notification_task(
    self, event_key, payload, recipient_ids, content_type_id, object_id
):
    from notifications.services.dispatcher import NotificationDispatchService

    try:
        NotificationDispatchService().dispatch(
            event_key, payload, recipient_ids, content_type_id, object_id
        )
    except Exception as exc:
        raise self.retry(exc=exc)
