from __future__ import annotations

from abc import ABC, abstractmethod


class BaseSecretStore(ABC):
    @abstractmethod
    def get_secret(self, name: str) -> str:
        raise NotImplementedError

    @abstractmethod
    def set_secret(self, name: str, value: str) -> str:
        raise NotImplementedError

    @abstractmethod
    def delete_secret(self, name: str) -> None:
        raise NotImplementedError


class InMemorySecretStore(BaseSecretStore):
    def __init__(self) -> None:
        self._secrets: dict[str, str] = {}

    def get_secret(self, name: str) -> str:
        from .exceptions import SecretNotFoundError

        try:
            return self._secrets[name]
        except KeyError as exc:
            raise SecretNotFoundError(f"Secret '{name}' was not found.") from exc

    def set_secret(self, name: str, value: str) -> str:
        self._secrets[name] = value
        return name

    def delete_secret(self, name: str) -> None:
        self._secrets.pop(name, None)
