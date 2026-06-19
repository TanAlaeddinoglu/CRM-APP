import logging

from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType

from notifications.channels import channel_registry
from notifications.exceptions import UnknownNotificationTypeError
from notifications.models import NotificationRule
from notifications.registry import registry

logger = logging.getLogger(__name__)

User = get_user_model()


class NotificationDispatchService:
    def dispatch(
        self,
        event_key: str,
        payload: dict,
        recipient_ids: list[int] | None,
        content_type_id: int | None,
        object_id: int | None,
    ) -> None:
        try:
            type_def = registry.get(event_key)
        except UnknownNotificationTypeError:
            logger.warning(
                "Dispatch skipped — unknown notification type: %s", event_key
            )
            return

        target = self._resolve_target(content_type_id, object_id)

        if recipient_ids is None:
            if type_def.recipient_resolver is None:
                logger.warning(
                    "No recipient_resolver and no recipients for %s", event_key
                )
                return
            try:
                resolved = type_def.recipient_resolver(target, payload)
            except Exception:
                logger.exception("recipient_resolver failed for %s", event_key)
                return
            recipients = [u for u in (resolved or []) if u is not None]
        else:
            if not recipient_ids:
                return
            recipients = list(User.objects.filter(pk__in=recipient_ids))

        if not recipients:
            return

        rules = list(
            NotificationRule.objects.filter(type_key=event_key, is_active=True)
        )
        if not rules:
            return

        for rule in rules:
            title = self._render(
                rule.title_template or type_def.default_title_template, payload
            )
            body = self._render(
                rule.body_template or type_def.default_body_template, payload
            )

            for channel_code in rule.channels:
                try:
                    channel = channel_registry.get(channel_code)
                except Exception:
                    logger.warning("Channel not found: %s", channel_code)
                    continue

                for recipient in recipients:
                    try:
                        channel.send(rule, recipient, title, body, payload, target)
                    except Exception:
                        logger.exception(
                            "Channel %s failed for recipient %s, rule %s",
                            channel_code,
                            recipient.pk,
                            rule.pk,
                        )

    def _render(self, template: str, payload: dict) -> str:
        try:
            return template.format(**payload)
        except (KeyError, ValueError):
            return template

    def _resolve_target(self, content_type_id: int | None, object_id: int | None):
        if content_type_id is None or object_id is None:
            return None
        try:
            ct = ContentType.objects.get_for_id(content_type_id)
            return ct.get_object_for_this_type(pk=object_id)
        except Exception:
            return None
