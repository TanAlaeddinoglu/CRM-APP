import pytest

from notifications.channels.registry import ChannelRegistry
from notifications.channels import channel_registry
from notifications.exceptions import ChannelNotRegisteredError


class DummyChannel:
    def send(self, rule, recipient, title, body, payload, target):
        pass


def test_channel_registry_register_and_get():
    reg = ChannelRegistry()
    ch = DummyChannel()
    reg.register("dummy", ch)
    assert reg.get("dummy") is ch


def test_channel_registry_get_unknown_raises():
    reg = ChannelRegistry()
    with pytest.raises(ChannelNotRegisteredError):
        reg.get("nonexistent")


def test_channel_registry_all_codes_returns_list():
    reg = ChannelRegistry()
    reg.register("a", DummyChannel())
    reg.register("b", DummyChannel())
    codes = reg.all_codes()
    assert "a" in codes
    assert "b" in codes


def test_global_channel_registry_has_in_app_and_email():
    codes = channel_registry.all_codes()
    assert "in_app" in codes
    assert "email" in codes
