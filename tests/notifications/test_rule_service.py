import pytest

from notifications.exceptions import RuleNotEditableError, UnknownNotificationTypeError
from notifications.models import NotificationRule
from notifications.services.rules import NotificationRuleService


pytestmark = pytest.mark.django_db

TYPE_KEY = "events.appointment_created"


# ── ensure_default_rule ───────────────────────────────────────────────────────


def test_ensure_default_rule_creates_on_first_call():
    rule = NotificationRuleService.ensure_default_rule(TYPE_KEY)
    assert rule.pk is not None
    assert rule.is_system_default is True
    assert rule.type_key == TYPE_KEY
    assert rule.is_active is True


def test_ensure_default_rule_idempotent(db):
    r1 = NotificationRuleService.ensure_default_rule(TYPE_KEY)
    r2 = NotificationRuleService.ensure_default_rule(TYPE_KEY)
    assert r1.pk == r2.pk
    assert (
        NotificationRule.objects.filter(
            type_key=TYPE_KEY, is_system_default=True
        ).count()
        == 1
    )


def test_ensure_default_rule_updates_varsayilan_name(db):
    NotificationRule.objects.create(
        type_key=TYPE_KEY,
        name="Varsayılan",
        channels=["in_app"],
        is_active=True,
        is_system_default=True,
    )
    updated = NotificationRuleService.ensure_default_rule(TYPE_KEY)
    updated.refresh_from_db()
    assert updated.name != "Varsayılan"
    assert updated.name == "Randevu oluşturuldu"


def test_ensure_default_rule_uses_type_label_as_name(db):
    rule = NotificationRuleService.ensure_default_rule(TYPE_KEY)
    assert rule.name == "Randevu oluşturuldu"


# ── create ────────────────────────────────────────────────────────────────────


def test_create_rule_success(regular_user):
    rule = NotificationRuleService.create(
        type_key=TYPE_KEY,
        name="Özel kural",
        channels=["in_app"],
        created_by=regular_user,
    )
    assert rule.pk is not None
    assert rule.is_system_default is False
    assert rule.created_by == regular_user


def test_create_rule_unknown_type_key_raises(db):
    with pytest.raises(UnknownNotificationTypeError):
        NotificationRuleService.create(
            type_key="nonexistent.key",
            name="Geçersiz",
            channels=["in_app"],
        )


def test_create_rule_with_templates(db):
    rule = NotificationRuleService.create(
        type_key=TYPE_KEY,
        name="Template kuralı",
        channels=["in_app"],
        title_template="Özel başlık",
        body_template="Özel gövde",
    )
    assert rule.title_template == "Özel başlık"
    assert rule.body_template == "Özel gövde"


# ── update ────────────────────────────────────────────────────────────────────


def test_update_rule_name_and_channels(active_rule):
    updated = NotificationRuleService.update(
        active_rule, name="Yeni isim", channels=["email"]
    )
    assert updated.name == "Yeni isim"
    assert updated.channels == ["email"]


def test_update_rule_is_active(active_rule):
    updated = NotificationRuleService.update(active_rule, is_active=False)
    assert updated.is_active is False


def test_update_system_default_name_raises(system_rule):
    with pytest.raises(RuleNotEditableError):
        NotificationRuleService.update(system_rule, name="Yeni isim")


def test_update_system_default_title_template_allowed(system_rule):
    # Sistem kuralları için şablon düzenlenmesine artık izin verilir.
    updated = NotificationRuleService.update(system_rule, title_template="Yeni şablon")
    assert updated.title_template == "Yeni şablon"


def test_update_system_default_channels_allowed(system_rule):
    updated = NotificationRuleService.update(system_rule, channels=["email"])
    assert updated.channels == ["email"]


def test_update_system_default_is_active_allowed(system_rule):
    updated = NotificationRuleService.update(system_rule, is_active=False)
    assert updated.is_active is False


# ── delete ────────────────────────────────────────────────────────────────────


def test_delete_custom_rule_success(active_rule):
    pk = active_rule.pk
    NotificationRuleService.delete(active_rule)
    assert not NotificationRule.objects.filter(pk=pk).exists()


def test_delete_system_default_raises(system_rule):
    with pytest.raises(RuleNotEditableError):
        NotificationRuleService.delete(system_rule)
