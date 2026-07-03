from typing import cast

from notifications.exceptions import RuleNotEditableError
from notifications.models import NotificationRule
from notifications.registry import registry


class NotificationRuleService:
    @staticmethod
    def ensure_default_rule(type_key: str) -> NotificationRule:
        type_def = registry.get(type_key)
        rule, created = NotificationRule.objects.get_or_create(
            type_key=type_key,
            is_system_default=True,
            defaults={
                "name": type_def.label,
                "channels": type_def.default_channels,
                "is_active": True,
            },
        )
        if not created and rule.name == "Varsayılan":
            rule.name = type_def.label
            rule.save(update_fields=["name", "updated_at"])
        return cast(NotificationRule, rule)

    @staticmethod
    def create(
        *,
        type_key: str,
        name: str,
        channels: list,
        title_template=None,
        body_template=None,
        created_by=None
    ) -> NotificationRule:
        registry.get(type_key)
        return cast(
            NotificationRule,
            NotificationRule.objects.create(
                type_key=type_key,
                name=name,
                channels=channels,
                title_template=title_template,
                body_template=body_template,
                is_active=True,
                is_system_default=False,
                created_by=created_by,
            ),
        )

    @staticmethod
    def update(
        rule: NotificationRule,
        *,
        name=None,
        channels=None,
        title_template=None,
        body_template=None,
        is_active=None
    ) -> NotificationRule:
        # Sistem varsayılan kurallarında yalnızca ad değiştirilemez;
        # şablon ve durum/kanal düzenlemesi serbesttir.
        if rule.is_system_default and name is not None:
            raise RuleNotEditableError(
                "System default rules cannot have their name changed."
            )

        if name is not None:
            rule.name = name
        if channels is not None:
            rule.channels = channels
        if title_template is not None:
            rule.title_template = title_template
        if body_template is not None:
            rule.body_template = body_template
        if is_active is not None:
            rule.is_active = is_active
        rule.save()
        return rule

    @staticmethod
    def delete(rule: NotificationRule) -> None:
        if rule.is_system_default:
            raise RuleNotEditableError("System default rules cannot be deleted.")
        rule.delete()
