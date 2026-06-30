"""Kural şablonlarının yalnız izinli değişkenleri kabul ettiğini doğrular."""
import events.notifications.notification_types  # noqa: registry'yi doldur
from notifications.serializers.rule import NotificationRuleSerializer


def _serializer(data):
    return NotificationRuleSerializer(data=data)


def test_allowed_tokens_accepted():
    s = _serializer(
        {
            "type_key": "events.appointment_created",
            "name": "Kural",
            "channels": ["in_app"],
            "title_template": "Yeni: {appointment_name} / {customer_name}",
            "body_template": "{actor_name} oluşturdu ({scheduled_for}).",
        }
    )
    assert s.is_valid(), s.errors


def test_unknown_token_rejected():
    s = _serializer(
        {
            "type_key": "events.appointment_created",
            "name": "Kural",
            "channels": ["in_app"],
            "title_template": "Merhaba {username}",
        }
    )
    assert not s.is_valid()
    assert "title_template" in s.errors


def test_unknown_token_in_body_rejected():
    s = _serializer(
        {
            "type_key": "tags.tag_created",
            "name": "Kural",
            "channels": ["in_app"],
            "title_template": "{tag_name}",
            "body_template": "{tag_name} - {foo}",
        }
    )
    assert not s.is_valid()
    assert "body_template" in s.errors


def test_empty_templates_ok():
    s = _serializer(
        {
            "type_key": "products.product_created",
            "name": "Kural",
            "channels": ["in_app"],
        }
    )
    assert s.is_valid(), s.errors
