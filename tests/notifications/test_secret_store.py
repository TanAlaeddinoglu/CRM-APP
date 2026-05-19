import pytest
from django.test import override_settings

from common.secrets.exceptions import (
    SecretNotFoundError,
    SecretStoreConfigurationError,
)
from common.secrets.factory import get_secret_store
from common.secrets.secret_store import InMemorySecretStore


def teardown_function():
    get_secret_store.cache_clear()


def test_in_memory_secret_store_round_trip():
    store = InMemorySecretStore()

    secret_name = store.set_secret("smtp-password", "super-secret")

    assert secret_name == "smtp-password"
    assert store.get_secret("smtp-password") == "super-secret"

    store.delete_secret("smtp-password")

    with pytest.raises(SecretNotFoundError):
        store.get_secret("smtp-password")


@override_settings(SECRET_STORE_BACKEND="memory")
def test_get_secret_store_returns_memory_backend():
    store = get_secret_store()

    assert isinstance(store, InMemorySecretStore)


@override_settings(SECRET_STORE_BACKEND="unsupported-backend")
def test_get_secret_store_rejects_unknown_backend():
    with pytest.raises(SecretStoreConfigurationError):
        get_secret_store()
