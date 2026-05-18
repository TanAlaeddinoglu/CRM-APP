from __future__ import annotations

from functools import lru_cache

from django.conf import settings

from .azure_key_vault import AzureKeyVaultSecretStore
from .exceptions import SecretStoreConfigurationError
from .secret_store import InMemorySecretStore


@lru_cache(maxsize=1)
def get_secret_store():
    backend = getattr(settings, "SECRET_STORE_BACKEND", "azure_key_vault")

    if backend == "memory":
        return InMemorySecretStore()

    if backend == "azure_key_vault":
        return AzureKeyVaultSecretStore(
            vault_url=getattr(settings, "AZURE_KEY_VAULT_URL", None),
            managed_identity_client_id=getattr(
                settings,
                "AZURE_MANAGED_IDENTITY_CLIENT_ID",
                None,
            ),
        )

    raise SecretStoreConfigurationError(
        f"Unsupported SECRET_STORE_BACKEND '{backend}'."
    )
