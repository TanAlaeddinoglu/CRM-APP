from django.contrib.contenttypes.models import ContentType

from .base import BaseChannel


class InAppChannel(BaseChannel):
    def send(
        self, rule, recipient, title: str, body: str, payload: dict, target
    ) -> None:
        from notifications.models import Notification

        content_type, object_id = self._target_info(target)
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

    def send_bulk(
        self, rule, recipients, title: str, body: str, payload: dict, target
    ) -> int:
        from notifications.models import Notification

        content_type, object_id = self._target_info(target)
        Notification.objects.bulk_create(
            [
                Notification(
                    recipient=r,
                    type_key=rule.type_key,
                    rule=rule,
                    title=title,
                    body=body,
                    context_payload=payload,
                    target_content_type=content_type,
                    target_object_id=object_id,
                )
                for r in recipients
            ]
        )
        return 0

    @staticmethod
    def _target_info(target):
        content_type = (
            ContentType.objects.get_for_model(target) if target is not None else None
        )
        object_id = target.pk if target is not None else None
        return content_type, object_id
