from django.db import transaction
from rest_framework import serializers

from notifications.channels import channel_registry
from notifications.models import NotificationRule
from .models import ReminderCondition, ReminderOffset, ReminderRule
from .services import (
    allowed_condition_fields,
    amount_unit_from_duration,
    duration_from_amount_unit,
)

UNIT_CHOICES = ("days", "hours", "minutes")


def _condition_value_lookup():
    """{field_name: {value: label}} — koşul doğrulaması için beyaz listeden."""
    return {
        f["name"]: {c["value"]: c["label"] for c in f["choices"]}
        for f in allowed_condition_fields()
    }


class NotificationRuleMinimalSerializer(serializers.ModelSerializer):
    """Hatırlatma kurallarında gömülü şablon/isim bilgisi için minimal gösterim."""

    class Meta:
        model = NotificationRule
        fields = [
            "id",
            "name",
            "type_key",
            "title_template",
            "body_template",
            "is_active",
        ]


class ReminderConditionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReminderCondition
        fields = ["field_name", "value"]

    def validate(self, attrs):
        lookup = _condition_value_lookup()
        field_name = attrs.get("field_name")
        value = attrs.get("value")
        if field_name not in lookup:
            raise serializers.ValidationError(
                {"field_name": f"İzin verilmeyen alan: {field_name}"}
            )
        if value not in lookup[field_name]:
            raise serializers.ValidationError(
                {"value": "Bu alan için geçerli bir değer seçin."}
            )
        return attrs


class ReminderOffsetSerializer(serializers.Serializer):
    amount = serializers.IntegerField(min_value=1)
    unit = serializers.ChoiceField(choices=UNIT_CHOICES)
    direction = serializers.ChoiceField(choices=ReminderOffset.Direction.values)

    def to_representation(self, instance):
        amount, unit = amount_unit_from_duration(instance.duration)
        return {
            "amount": amount,
            "unit": unit,
            "direction": instance.direction,
        }


class ReminderRuleSerializer(serializers.ModelSerializer):
    conditions = ReminderConditionSerializer(many=True, required=False)
    offsets = ReminderOffsetSerializer(many=True)
    notification_rule = NotificationRuleMinimalSerializer(read_only=True)
    notification_rule_id = serializers.PrimaryKeyRelatedField(
        queryset=NotificationRule.objects.all(),
        source="notification_rule",
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = ReminderRule
        fields = [
            "id",
            "name",
            "is_active",
            "notification_rule",
            "notification_rule_id",
            "channels",
            "notify_assigned_user",
            "notify_admins",
            "conditions",
            "offsets",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_channels(self, value):
        valid_codes = channel_registry.all_codes()
        invalid = [c for c in value if c not in valid_codes]
        if invalid:
            raise serializers.ValidationError(
                f"Geçersiz kanal(lar): {invalid}. Geçerli: {valid_codes}"
            )
        return value

    def validate_offsets(self, value):
        if not value:
            raise serializers.ValidationError("En az bir hatırlatma zamanı ekleyin.")
        return value

    def validate(self, attrs):
        assigned = attrs.get(
            "notify_assigned_user",
            getattr(self.instance, "notify_assigned_user", False),
        )
        admins = attrs.get(
            "notify_admins", getattr(self.instance, "notify_admins", False)
        )
        if not assigned and not admins:
            raise serializers.ValidationError(
                "En az bir alıcı hedefi seçin (atanmış kullanıcı veya adminler)."
            )
        return attrs

    def _write_conditions(self, rule, conditions):
        rule.conditions.all().delete()
        ReminderCondition.objects.bulk_create(
            [ReminderCondition(rule=rule, **c) for c in conditions]
        )

    def _write_offsets(self, rule, offsets):
        rule.offsets.all().delete()
        ReminderOffset.objects.bulk_create(
            [
                ReminderOffset(
                    rule=rule,
                    duration=duration_from_amount_unit(o["amount"], o["unit"]),
                    direction=o["direction"],
                )
                for o in offsets
            ]
        )

    @transaction.atomic
    def create(self, validated_data):
        conditions = validated_data.pop("conditions", [])
        offsets = validated_data.pop("offsets", [])
        rule = ReminderRule.objects.create(**validated_data)
        self._write_conditions(rule, conditions)
        self._write_offsets(rule, offsets)
        return rule

    @transaction.atomic
    def update(self, instance, validated_data):
        conditions = validated_data.pop("conditions", None)
        offsets = validated_data.pop("offsets", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if conditions is not None:
            self._write_conditions(instance, conditions)
        if offsets is not None:
            self._write_offsets(instance, offsets)
        return instance
