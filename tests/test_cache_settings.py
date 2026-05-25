import importlib


def test_base_settings_use_redis_cache_when_django_cache_url_is_set(monkeypatch):
    monkeypatch.setenv("SECRET_STORE_BACKEND", "env")
    monkeypatch.setenv("DJANGO_SECRET_KEY", "test-secret-key")
    monkeypatch.setenv("POSTGRES_USER", "crm_user")
    monkeypatch.setenv("POSTGRES_PASSWORD", "db_password")
    monkeypatch.setenv("CELERY_BROKER_URL", "memory://")
    monkeypatch.setenv("CELERY_RESULT_BACKEND", "cache+memory://")
    monkeypatch.setenv("DJANGO_CACHE_URL", "redis://localhost:6379/2")
    monkeypatch.setenv("DEFAULT_FROM_EMAIL", "sender@example.com")

    import djangoCRM.settings as base_settings

    reloaded = importlib.reload(base_settings)

    assert reloaded.CACHES["default"]["BACKEND"] == (
        "django.core.cache.backends.redis.RedisCache"
    )
    assert reloaded.CACHES["default"]["LOCATION"] == "redis://localhost:6379/2"
    assert reloaded.CACHES["default"]["KEY_PREFIX"] == "djangocrm"
    assert reloaded.CACHES["default"]["TIMEOUT"] == 120


def test_base_settings_fall_back_to_locmem_cache_without_django_cache_url(monkeypatch):
    monkeypatch.setenv("SECRET_STORE_BACKEND", "env")
    monkeypatch.setenv("DJANGO_SECRET_KEY", "test-secret-key")
    monkeypatch.setenv("POSTGRES_USER", "crm_user")
    monkeypatch.setenv("POSTGRES_PASSWORD", "db_password")
    monkeypatch.setenv("CELERY_BROKER_URL", "memory://")
    monkeypatch.setenv("CELERY_RESULT_BACKEND", "cache+memory://")
    monkeypatch.setenv("DJANGO_CACHE_URL", "")
    monkeypatch.setenv("DEFAULT_FROM_EMAIL", "sender@example.com")

    import djangoCRM.settings as base_settings

    reloaded = importlib.reload(base_settings)

    assert reloaded.CACHES["default"]["BACKEND"] == (
        "django.core.cache.backends.locmem.LocMemCache"
    )
    assert reloaded.CACHES["default"]["LOCATION"] == "login-throttle"
    assert reloaded.CACHES["default"]["TIMEOUT"] == 120
