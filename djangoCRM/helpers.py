from __future__ import annotations

import os
from importlib.util import find_spec
from pathlib import Path

from common.secrets.azure_key_vault import AzureKeyVaultSecretStore
from common.secrets.exceptions import (
    SecretNotFoundError,
    SecretStoreConfigurationError,
)
from django.core.exceptions import ImproperlyConfigured


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("\"'")

        if key and key not in os.environ:
            os.environ[key] = value


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name, str(default))
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_str(
    name: str, default: str | None = None, *, required: bool = False
) -> str | None:
    value = os.getenv(name, default)
    if value is None:
        if required:
            raise ImproperlyConfigured(f"{name} environment variable must be set.")
        return None

    value = value.strip()
    if required and not value:
        raise ImproperlyConfigured(f"{name} environment variable must not be empty.")
    return value or default


def env_list(name: str, default: str = "") -> list[str]:
    value = env_str(name, default) or ""
    return [item.strip() for item in value.split(",") if item.strip()]


def module_exists(name: str) -> bool:
    try:
        return find_spec(name) is not None
    except ModuleNotFoundError:
        return False


class SettingsSecretResolver:
    def __init__(
        self,
        *,
        backend: str,
        vault_url: str | None = None,
        managed_identity_client_id: str | None = None,
        secret_names: dict[str, str] | None = None,
    ) -> None:
        self.backend = backend
        self.vault_url = vault_url
        self.managed_identity_client_id = managed_identity_client_id
        self.secret_names = secret_names or {}
        self._secret_store = None

    def get_secret(
        self,
        name: str,
        default: str | None = None,
        *,
        required: bool = False,
    ) -> str | None:
        if self.backend in {"env", "memory"}:
            return env_str(name, default, required=required)

        store = self._get_secret_store()
        secret_name = self.secret_names.get(name, name.lower().replace("_", "-"))

        try:
            value = store.get_secret(secret_name)
        except SecretNotFoundError as exc:
            if default is not None:
                return default
            if required:
                raise ImproperlyConfigured(
                    f"Required secret '{secret_name}' for setting '{name}' was not found."
                ) from exc
            return None
        except Exception as exc:
            raise ImproperlyConfigured(
                f"Failed to load setting secret '{name}' from Azure Key Vault."
            ) from exc

        value = (value or "").strip()
        if required and not value:
            raise ImproperlyConfigured(
                f"Secret value for setting '{name}' must not be empty."
            )
        return value or default

    def _get_secret_store(self):
        if self._secret_store is not None:
            return self._secret_store

        if self.backend in {"env", "memory"}:
            return None

        if self.backend != "azure_key_vault":
            raise ImproperlyConfigured(
                f"Unsupported SECRET_STORE_BACKEND '{self.backend}'."
            )

        try:
            self._secret_store = AzureKeyVaultSecretStore(
                vault_url=self.vault_url,
                managed_identity_client_id=self.managed_identity_client_id,
            )
        except SecretStoreConfigurationError as exc:
            raise ImproperlyConfigured(str(exc)) from exc

        return self._secret_store
