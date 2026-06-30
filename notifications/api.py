from django.contrib.contenttypes.models import ContentType


def notify(
    event_key: str,
    payload: dict,
    recipients=None,
    target=None,
    channels=None,
    system_only: bool = False,
    notification_rule_id: int | None = None,
) -> None:
    """Bildirim gönderim görevini kuyruğa alır.

    notification_rule_id verilirse dispatcher yalnızca o kuralı kullanır (type_key
    sorgusu yapılmaz). Hatırlatma gönderimi bu parametreyi kullanır.
    system_only=True olduğunda dispatcher yalnızca is_system_default=True kuralını
    kullanır.
    """
    from notifications.tasks import dispatch_notification_task

    recipient_ids = None
    if recipients is not None:
        recipient_ids = [r.pk if hasattr(r, "pk") else r for r in recipients]
        if not recipient_ids:
            return

    content_type_id = (
        ContentType.objects.get_for_model(target).id if target is not None else None
    )
    object_id = target.pk if target is not None else None

    dispatch_notification_task.delay(
        event_key,
        payload,
        recipient_ids,
        content_type_id,
        object_id,
        channels,
        system_only,
        notification_rule_id,
    )
