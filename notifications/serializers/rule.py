from rest_framework import serializers

from notifications.channels import channel_registry
from notifications.exceptions import UnknownNotificationTypeError
from notifications.models import NotificationRule
from notifications.registry import registry
from notifications.utils import extract_template_keys


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
        # DRF 3.15 get_unique_validators(), UniqueConstraint'i okuyup type_key fieldına
        # doğrudan UniqueValidator ekler. Bu validator DB'ye sorgu atar ve is_valid()'i
        # @pytest.mark.django_db olmayan testlerde bozar. Ayrıca kısmi UNIQUE indeksini
        # (is_system_default=True) yanlış yorumlayarak normal kurallar için de hata üretir.
        # Constraint zaten DB düzeyinde korunduğundan bu validator gereksizdir.
        validators: list = []
        extra_kwargs: dict = {
            "type_key": {"validators": []},
        }

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

    def validate(self, attrs):
        # Şablonlar yalnız ilgili bildirim tipinin izinli değişkenlerini içerebilir.
        type_key = attrs.get("type_key") or getattr(self.instance, "type_key", None)
        if not type_key:
            return attrs
        try:
            type_def = registry.get(type_key)
        except UnknownNotificationTypeError:
            return attrs

        allowed = type_def.variable_keys()
        for field_name in ("title_template", "body_template"):
            template = attrs.get(field_name)
            if not template:
                continue
            used = extract_template_keys(template)
            invalid = sorted(used - allowed)
            if invalid:
                allowed_list = ", ".join(sorted(allowed)) or "—"
                raise serializers.ValidationError(
                    {
                        field_name: [
                            "Geçersiz değişken(ler): "
                            + ", ".join("{" + k + "}" for k in invalid)
                            + f". İzinli değişkenler: {allowed_list}."
                        ]
                    }
                )
        return attrs
