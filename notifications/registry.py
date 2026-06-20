from dataclasses import dataclass
from typing import Callable, Optional

from .exceptions import UnknownNotificationTypeError


@dataclass(frozen=True)
class NotificationTypeDefinition:
    key: str
    label: str
    app_label: str
    default_channels: list
    default_title_template: str
    default_body_template: str
    # callable(target, payload) -> list[User]
    recipient_resolver: Optional[Callable[..., list]] = None


class NotificationTypeRegistry:
    def __init__(self):
        self._types: dict[str, NotificationTypeDefinition] = {}

    def register(
        self,
        *,
        key: str,
        label: str,
        app_label: str,
        default_channels: list,
        default_title_template: str,
        default_body_template: str,
        recipient_resolver=None,
    ) -> None:
        self._types[key] = NotificationTypeDefinition(
            key=key,
            label=label,
            app_label=app_label,
            default_channels=list(default_channels),
            default_title_template=default_title_template,
            default_body_template=default_body_template,
            recipient_resolver=recipient_resolver,
        )

    def get(self, key: str) -> NotificationTypeDefinition:
        if key not in self._types:
            raise UnknownNotificationTypeError(f"Unknown notification type: {key}")
        return self._types[key]

    def all(self) -> list[NotificationTypeDefinition]:
        return list(self._types.values())


registry = NotificationTypeRegistry()
