import importlib

import pytest
from django.core.exceptions import ImproperlyConfigured

from common.secrets.exceptions import SecretNotFoundError


def _configure_base_env(monkeypatch):
    monkeypatch.setenv("POSTGRES_DB", "crm_database")
    monkeypatch.setenv("POSTGRES_HOST", "db")
    monkeypatch.setenv("POSTGRES_PORT", "5432")
    monkeypatch.setenv("DEFAULT_FROM_EMAIL", "sender@example.com")


def test_settings_read_secrets_from_env_backend(monkeypatch):
    _configure_base_env(monkeypatch)
    monkeypatch.setenv("SECRET_STORE_BACKEND", "env")
    monkeypatch.setenv("DJANGO_SECRET_KEY", "env-secret-key")
    monkeypatch.setenv("POSTGRES_USER", "env-db-user")
    monkeypatch.setenv("POSTGRES_PASSWORD", "env-db-password")
    monkeypatch.setenv("CELERY_BROKER_URL", "memory://")
    monkeypatch.setenv("CELERY_RESULT_BACKEND", "cache+memory://")
    monkeypatch.setenv("DJANGO_CACHE_URL", "redis://localhost:6379/2")

    import djangoCRM.settings as base_settings

    reloaded = importlib.reload(base_settings)

    assert reloaded.SECRET_KEY == "env-secret-key"
    assert reloaded.DATABASES["default"]["USER"] == "env-db-user"
    assert reloaded.DATABASES["default"]["PASSWORD"] == "env-db-password"
    assert reloaded.CELERY_BROKER_URL == "memory://"
    assert reloaded.CELERY_RESULT_BACKEND == "cache+memory://"
    assert reloaded.DJANGO_CACHE_URL == "redis://localhost:6379/2"


def test_settings_read_secrets_from_azure_key_vault(monkeypatch):
    _configure_base_env(monkeypatch)
    monkeypatch.setenv("SECRET_STORE_BACKEND", "azure_key_vault")
    monkeypatch.setenv("AZURE_KEY_VAULT_URL", "https://example.vault.azure.net/")

    secret_values = {
        "django-secret-key": "vault-secret-key",
        "postgres-user": "vault-db-user",
        "postgres-password": "vault-db-password",
        "celery-broker-url": "amqp://vault-user:vault-pass@rabbitmq:5672//",
        "celery-result-backend": "redis://:vault-pass@redis:6379/1",
        "django-cache-url": "redis://:vault-pass@redis:6379/2",
        "flower-basic-auth": "admin:vault-pass",
        "redis-password": "vault-pass",
        "rabbitmq-default-user": "vault-rabbit-user",
        "rabbitmq-default-pass": "vault-rabbit-pass",
    }

    def fake_get_secret(self, name):
        try:
            return secret_values[name]
        except KeyError as exc:
            raise SecretNotFoundError(name) from exc

    monkeypatch.setattr(
        "common.secrets.azure_key_vault.AzureKeyVaultSecretStore.get_secret",
        fake_get_secret,
    )

    import djangoCRM.settings as base_settings

    reloaded = importlib.reload(base_settings)

    assert reloaded.SECRET_KEY == "vault-secret-key"
    assert reloaded.DATABASES["default"]["USER"] == "vault-db-user"
    assert reloaded.DATABASES["default"]["PASSWORD"] == "vault-db-password"
    assert reloaded.CELERY_BROKER_URL == secret_values["celery-broker-url"]
    assert reloaded.CELERY_RESULT_BACKEND == secret_values["celery-result-backend"]
    assert reloaded.DJANGO_CACHE_URL == secret_values["django-cache-url"]


def test_settings_require_azure_secrets_when_backend_is_key_vault(monkeypatch):
    _configure_base_env(monkeypatch)
    monkeypatch.setenv("SECRET_STORE_BACKEND", "azure_key_vault")
    monkeypatch.setenv("AZURE_KEY_VAULT_URL", "https://example.vault.azure.net/")

    def missing_secret(self, name):
        raise SecretNotFoundError(name)

    monkeypatch.setattr(
        "common.secrets.azure_key_vault.AzureKeyVaultSecretStore.get_secret",
        missing_secret,
    )

    import djangoCRM.settings as base_settings

    with pytest.raises(ImproperlyConfigured):
        importlib.reload(base_settings)
