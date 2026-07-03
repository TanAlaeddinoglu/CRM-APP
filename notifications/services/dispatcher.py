import logging

from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType

from notifications.channels import channel_registry
from notifications.exceptions import UnknownNotificationTypeError
from notifications.models import NotificationRule
from notifications.registry import registry
from notifications.utils import render_template

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
        channels: list[str] | None = None,
        system_only: bool = False,
        notification_rule_id: int | None = None,
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

        if notification_rule_id is not None:
            # Belirli bir kural doğrudan belirtilmiş (ör. hatırlatma gönderimi).
            rules = list(
                NotificationRule.objects.filter(pk=notification_rule_id, is_active=True)
            )
        else:
            rules_qs = NotificationRule.objects.filter(
                type_key=event_key, is_active=True
            )
            if system_only:
                rules_qs = rules_qs.filter(is_system_default=True)
            rules = list(rules_qs)
        if not rules:
            return

        total_attempts = 0
        total_failures = 0

        for rule in rules:
            title = self._render(
                rule.title_template or type_def.default_title_template, payload
            )
            body = self._render(
                rule.body_template or type_def.default_body_template, payload
            )

            # Çağıran kanal listesi verdiyse kuralın kanallarını geçersiz kıl
            # (ör. hatırlatma kuralları kendi kanallarını taşır; şablonlar yine
            # tipin sistem kuralından gelir).
            rule_channels = channels if channels is not None else rule.channels
            for channel_code in rule_channels:
                try:
                    channel = channel_registry.get(channel_code)
                except Exception:
                    logger.warning("Channel not found: %s", channel_code)
                    continue

                total_attempts += len(recipients)
                try:
                    failures = channel.send_bulk(
                        rule, recipients, title, body, payload, target
                    )
                except Exception:
                    logger.exception(
                        "Channel %s failed entirely for rule %s", channel_code, rule.pk
                    )
                    failures = len(recipients)
                total_failures += failures

        if total_failures == total_attempts and total_attempts > 0:
            raise RuntimeError(
                f"All {total_failures} notification deliveries failed for event {event_key}"
            )

    def _render(self, template: str, payload: dict) -> str:
        return str(render_template(template, payload))

    def _resolve_target(self, content_type_id: int | None, object_id: int | None):
        if content_type_id is None or object_id is None:
            return None
        try:
            ct = ContentType.objects.get_for_id(content_type_id)
            return ct.get_object_for_this_type(pk=object_id)
        except Exception:
            return None
