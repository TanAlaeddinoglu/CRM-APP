import pytest

from notifications.exceptions import UnknownNotificationTypeError
from notifications.registry import NotificationTypeRegistry


@pytest.fixture
def reg():
    """Her test için temiz bir registry instance'ı."""
    return NotificationTypeRegistry()


def _register(reg, key="test.event", resolver=None):
    reg.register(
        key=key,
        label="Test Olayı",
        app_label="test_app",
        default_channels=["in_app"],
        default_title_template="Başlık: {name}",
        default_body_template="Gövde: {name}",
        recipient_resolver=resolver,
    )


def test_registry_register_and_get(reg):
    _register(reg)
    type_def = reg.get("test.event")
    assert type_def.key == "test.event"
    assert type_def.label == "Test Olayı"
    assert type_def.app_label == "test_app"
    assert type_def.default_channels == ["in_app"]


def test_registry_get_unknown_raises(reg):
    with pytest.raises(UnknownNotificationTypeError):
        reg.get("nonexistent.key")


def test_registry_all_returns_all_registered(reg):
    _register(reg, key="test.one")
    _register(reg, key="test.two")
    keys = [t.key for t in reg.all()]
    assert "test.one" in keys
    assert "test.two" in keys
    assert len(keys) == 2


def test_registry_definition_is_frozen(reg):
    _register(reg)
    type_def = reg.get("test.event")
    with pytest.raises(
        Exception
    ):  # FrozenInstanceError (dataclasses.FrozenInstanceError)
        type_def.key = "changed"


def test_registry_register_with_resolver_stores_callable(reg):
    def resolver(target, payload):
        return []

    _register(reg, resolver=resolver)
    assert reg.get("test.event").recipient_resolver is resolver


def test_registry_register_without_resolver_defaults_none(reg):
    _register(reg)
    assert reg.get("test.event").recipient_resolver is None


def test_registry_all_returns_list(reg):
    result = reg.all()
    assert isinstance(result, list)


def test_registry_default_channels_is_copy(reg):
    """Orijinal list değiştirme registry'yi etkilememeli."""
    channels = ["in_app", "email"]
    reg.register(
        key="test.copy",
        label="Copy Test",
        app_label="test",
        default_channels=channels,
        default_title_template="",
        default_body_template="",
    )
    channels.clear()
    assert reg.get("test.copy").default_channels == ["in_app", "email"]
