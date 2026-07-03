from dataclasses import dataclass, field
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
    # Kullanıcıya gösterilecek kısa açıklama (ne zaman, kime gider)
    description: str = ""
    # Şablonlarda kullanılabilecek değişkenler: [{"key": str, "label": str}, ...]
    variables: tuple = field(default_factory=tuple)
    # "general" (normal bildirim kanalı) | "reminder" (zamanlayıcı bölümü)
    # Yeni tipler bu alanı doldurunca frontend otomatik olarak doğru bölüme yerleştirir.
    category: str = "general"

    def variable_keys(self) -> set:
        return {v["key"] for v in self.variables}


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
        description: str = "",
        variables=None,
        category: str = "general",
    ) -> None:
        self._types[key] = NotificationTypeDefinition(
            key=key,
            label=label,
            app_label=app_label,
            default_channels=list(default_channels),
            default_title_template=default_title_template,
            default_body_template=default_body_template,
            recipient_resolver=recipient_resolver,
            description=description,
            variables=tuple(variables or ()),
            category=category,
        )

    def get(self, key: str) -> NotificationTypeDefinition:
        if key not in self._types:
            raise UnknownNotificationTypeError(f"Unknown notification type: {key}")
        return self._types[key]

    def all(self) -> list[NotificationTypeDefinition]:
        return list(self._types.values())


registry = NotificationTypeRegistry()
