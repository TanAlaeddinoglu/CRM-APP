from notifications.exceptions import ChannelNotRegisteredError

from .base import BaseChannel


class ChannelRegistry:
    def __init__(self):
        self._channels: dict[str, BaseChannel] = {}

    def register(self, code: str, instance: BaseChannel) -> None:
        self._channels[code] = instance

    def get(self, code: str) -> BaseChannel:
        if code not in self._channels:
            raise ChannelNotRegisteredError(f"Channel not registered: {code}")
        return self._channels[code]

    def all_codes(self) -> list[str]:
        return list(self._channels.keys())


channel_registry = ChannelRegistry()
