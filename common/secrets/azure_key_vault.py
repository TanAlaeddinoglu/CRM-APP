from __future__ import annotations

from typing import Any, cast

from .exceptions import SecretNotFoundError, SecretStoreConfigurationError
from .secret_store import BaseSecretStore


class AzureKeyVaultSecretStore(BaseSecretStore):
    def __init__(
        self,
        *,
        vault_url: str,
        managed_identity_client_id: str | None = None,
        client=None,
    ) -> None:
        if not vault_url:
            raise SecretStoreConfigurationError(
                "AZURE_KEY_VAULT_URL must be configured for Azure Key Vault usage."
            )

        self.vault_url = vault_url
        self.managed_identity_client_id = managed_identity_client_id
        self._client = client

    @property
    def client(self) -> Any:
        if self._client is None:
            self._client = self._build_client()
        return self._client

    def _build_client(self) -> Any:
        try:
            from azure.identity import DefaultAzureCredential
            from azure.keyvault.secrets import SecretClient
        except ImportError as exc:
            raise SecretStoreConfigurationError(
                "Azure Key Vault dependencies are not installed."
            ) from exc

        credential_kwargs = {}
        if self.managed_identity_client_id:
            credential_kwargs[
                "managed_identity_client_id"
            ] = self.managed_identity_client_id

        credential = DefaultAzureCredential(**credential_kwargs)
        return SecretClient(vault_url=self.vault_url, credential=credential)

    def get_secret(self, name: str) -> str:
        try:
            return cast(str, self.client.get_secret(name).value)
        except Exception as exc:
            if exc.__class__.__name__ == "ResourceNotFoundError":
                raise SecretNotFoundError(
                    f"Secret '{name}' was not found in Azure Key Vault."
                ) from exc
            raise

    def set_secret(self, name: str, value: str) -> str:
        self.client.set_secret(name, value)
        return name

    def delete_secret(self, name: str) -> None:
        try:
            operation = self.client.begin_delete_secret(name)
            operation.wait()
        except Exception as exc:
            if exc.__class__.__name__ == "ResourceNotFoundError":
                return
            raise
