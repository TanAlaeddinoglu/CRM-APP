from django.contrib.contenttypes.models import ContentType

from .base import BaseChannel


class InAppChannel(BaseChannel):
    def send(
        self, rule, recipient, title: str, body: str, payload: dict, target
    ) -> None:
        from notifications.models import Notification

        content_type = (
            ContentType.objects.get_for_model(target) if target is not None else None
        )
        object_id = target.pk if target is not None else None

        Notification.objects.create(
            recipient=recipient,
            type_key=rule.type_key,
            rule=rule,
            title=title,
            body=body,
            context_payload=payload,
            target_content_type=content_type,
            target_object_id=object_id,
        )
