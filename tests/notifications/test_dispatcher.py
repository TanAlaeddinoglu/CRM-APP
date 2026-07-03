import pytest

from notifications.models import Notification, NotificationRule
from notifications.services.dispatcher import NotificationDispatchService


pytestmark = pytest.mark.django_db


@pytest.fixture
def rule(db):
    return NotificationRule.objects.create(
        type_key="events.appointment_created",
        name="Test",
        channels=["in_app"],
        is_active=True,
        is_system_default=False,
    )


@pytest.fixture
def inactive_rule(db):
    return NotificationRule.objects.create(
        type_key="events.appointment_created",
        name="Pasif",
        channels=["in_app"],
        is_active=False,
        is_system_default=False,
    )


def dispatch(event_key="events.appointment_created", payload=None, recipient_ids=None):
    NotificationDispatchService().dispatch(
        event_key=event_key,
        payload=payload or {},
        recipient_ids=recipient_ids,
        content_type_id=None,
        object_id=None,
    )


# ── Bilinmeyen event key ──────────────────────────────────────────────────────


def test_dispatch_unknown_event_key_does_not_raise():
    dispatch(event_key="nonexistent.key", recipient_ids=[999])
    assert Notification.objects.count() == 0


# ── Explicit recipient_ids ────────────────────────────────────────────────────


def test_dispatch_with_explicit_recipient_creates_notification(rule, regular_user):
    dispatch(recipient_ids=[regular_user.pk])
    assert Notification.objects.filter(recipient=regular_user).count() == 1


def test_dispatch_with_multiple_recipients(rule, regular_user, second_user):
    dispatch(recipient_ids=[regular_user.pk, second_user.pk])
    assert Notification.objects.count() == 2


def test_dispatch_empty_recipient_ids_skips(rule, regular_user):
    dispatch(recipient_ids=[])
    assert Notification.objects.count() == 0


def test_dispatch_channels_override_supersedes_rule_channels(regular_user):
    # Kural e-posta kanalında olsa da override in_app verilirse in_app kullanılır.
    NotificationRule.objects.create(
        type_key="events.appointment_created",
        name="Email rule",
        channels=["email"],
        is_active=True,
        is_system_default=False,
    )
    NotificationDispatchService().dispatch(
        event_key="events.appointment_created",
        payload={},
        recipient_ids=[regular_user.pk],
        content_type_id=None,
        object_id=None,
        channels=["in_app"],
    )
    assert Notification.objects.filter(recipient=regular_user).count() == 1


# ── Resolver path (recipient_ids=None) ───────────────────────────────────────


def test_dispatch_calls_resolver_when_no_recipient_ids(rule, regular_user, monkeypatch):
    called_with = []

    def mock_resolver(target, payload):
        called_with.append((target, payload))
        return [regular_user]

    monkeypatch.setattr(
        "notifications.registry.registry._types",
        {
            **{
                k: v
                for k, v in __import__(
                    "notifications.registry", fromlist=["registry"]
                ).registry._types.items()
            },
        },
    )
    # Daha temiz: doğrudan type_def üzerinde resolver'ı patch'le
    from notifications.registry import registry as reg

    original = reg._types["events.appointment_created"]
    from dataclasses import replace

    patched = replace(original, recipient_resolver=mock_resolver)
    reg._types["events.appointment_created"] = patched

    try:
        dispatch(recipient_ids=None)
    finally:
        reg._types["events.appointment_created"] = original

    assert len(called_with) == 1
    assert Notification.objects.filter(recipient=regular_user).count() == 1


def test_dispatch_resolver_none_and_no_recipient_ids_skips(
    rule, regular_user, monkeypatch
):
    from notifications.registry import registry as reg

    original = reg._types["events.appointment_created"]
    from dataclasses import replace

    patched = replace(original, recipient_resolver=None)
    reg._types["events.appointment_created"] = patched

    try:
        dispatch(recipient_ids=None)
    finally:
        reg._types["events.appointment_created"] = original

    assert Notification.objects.count() == 0


def test_dispatch_resolver_returns_empty_skips(rule, regular_user, monkeypatch):
    from notifications.registry import registry as reg

    original = reg._types["events.appointment_created"]
    from dataclasses import replace

    patched = replace(original, recipient_resolver=lambda t, p: [])
    reg._types["events.appointment_created"] = patched

    try:
        dispatch(recipient_ids=None)
    finally:
        reg._types["events.appointment_created"] = original

    assert Notification.objects.count() == 0


# ── Rule filtreleme ───────────────────────────────────────────────────────────


def test_dispatch_no_active_rules_skips(inactive_rule, regular_user):
    dispatch(recipient_ids=[regular_user.pk])
    assert Notification.objects.count() == 0


# ── Template rendering ────────────────────────────────────────────────────────


def test_dispatch_renders_rule_template(rule, regular_user):
    rule.title_template = "Merhaba {name}"
    rule.save()
    dispatch(payload={"name": "Ali"}, recipient_ids=[regular_user.pk])
    n = Notification.objects.get(recipient=regular_user)
    assert n.title == "Merhaba Ali"


def test_dispatch_falls_back_to_type_def_template_when_rule_template_null(
    rule, regular_user
):
    # rule.title_template = None → type_def.default_title_template kullanılır
    rule.title_template = None
    rule.save()
    dispatch(
        payload={"appointment_name": "Randevu A", "appointment_id": 1},
        recipient_ids=[regular_user.pk],
    )
    n = Notification.objects.get(recipient=regular_user)
    assert "Randevu A" in n.title


def test_dispatch_template_missing_key_renders_empty(rule, regular_user):
    # Güvenli render: eksik anahtar boş string olur (str.format'ın aksine).
    svc = NotificationDispatchService()
    result = svc._render("merhaba {missing_key}!", {})
    assert result == "merhaba !"


# ── Channel hataları diğer recipient'ları durdurmaz ──────────────────────────


def test_dispatch_channel_failure_does_not_stop_other_recipients(
    rule, regular_user, second_user, monkeypatch
):
    # InAppChannel.send_bulk artık bulk_create kullanıyor (atomik).
    # Per-recipient izolasyonu BaseChannel.send_bulk'un loop'unda yaşıyor;
    # onu test etmek için InAppChannel.send_bulk'u base implementasyona yönlendiriyoruz.
    from notifications.channels.base import BaseChannel
    from notifications.channels.in_app import InAppChannel

    call_count = [0]
    original_send = InAppChannel.send

    def flaky_send(self, r, recipient, title, body, payload, target):
        call_count[0] += 1
        if call_count[0] == 1:
            raise RuntimeError("Kanal hatası")
        original_send(self, r, recipient, title, body, payload, target)

    monkeypatch.setattr("notifications.channels.in_app.InAppChannel.send", flaky_send)
    monkeypatch.setattr(
        "notifications.channels.in_app.InAppChannel.send_bulk",
        BaseChannel.send_bulk,
    )

    dispatch(recipient_ids=[regular_user.pk, second_user.pk])
    # İlk recipient hata verdi ama ikincisi başarılı olmalı
    assert Notification.objects.count() == 1


# ── _resolve_target ───────────────────────────────────────────────────────────


def test_resolve_target_returns_none_when_ids_none():
    svc = NotificationDispatchService()
    assert svc._resolve_target(None, None) is None


def test_resolve_target_returns_object_when_valid(rule, regular_user):
    from django.contrib.contenttypes.models import ContentType
    from notifications.models import NotificationRule

    ct = ContentType.objects.get_for_model(NotificationRule)
    svc = NotificationDispatchService()
    result = svc._resolve_target(ct.id, rule.pk)
    assert result is not None
    assert result.pk == rule.pk
