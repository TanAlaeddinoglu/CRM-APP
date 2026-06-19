from rest_framework import serializers

from notifications.channels import channel_registry
from notifications.exceptions import UnknownNotificationTypeError
from notifications.models import NotificationRule
from notifications.registry import registry


class NotificationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationRule
        fields = [
            "id",
            "type_key",
            "name",
            "channels",
            "title_template",
            "body_template",
            "is_active",
            "is_system_default",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "is_system_default",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def validate_type_key(self, value):
        try:
            registry.get(value)
        except UnknownNotificationTypeError:
            raise serializers.ValidationError(f"Unknown notification type: {value}")
        return value

    def validate_channels(self, value):
        valid_codes = channel_registry.all_codes()
        invalid = [c for c in value if c not in valid_codes]
        if invalid:
            raise serializers.ValidationError(
                f"Invalid channel(s): {invalid}. Valid: {valid_codes}"
            )
        return value
