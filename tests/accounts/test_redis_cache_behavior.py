import time

import pytest
from django.core.cache import cache
from rest_framework.exceptions import Throttled

from accounts import throttling


pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def clear_default_cache():
    cache.clear()
    yield
    cache.clear()


def test_cache_stores_and_returns_structured_values():
    payload = {
        "attempts": 3,
        "locked": True,
        "metadata": {"source": "login", "identifier": "cache-user"},
    }

    cache.set("redis-behavior:structured", payload, timeout=5)

    assert cache.get("redis-behavior:structured") == payload


def test_cache_timeout_expires_and_removes_value():
    cache.set("redis-behavior:ttl", {"state": "pending"}, timeout=1)

    assert cache.get("redis-behavior:ttl") == {"state": "pending"}

    time.sleep(1.2)

    assert cache.get("redis-behavior:ttl") is None


def test_increase_login_attempt_persists_counter_with_expected_key(monkeypatch):
    monkeypatch.setattr(throttling, "BLOCK_TIME", 5)

    throttling.increase_login_attempt("cache@example.com")
    throttling.increase_login_attempt("cache@example.com")

    assert cache.get("login_attempts:cache@example.com") == 2


def test_reset_login_attempts_removes_cached_value(monkeypatch):
    monkeypatch.setattr(throttling, "BLOCK_TIME", 5)
    throttling.increase_login_attempt("reset@example.com")

    assert cache.get("login_attempts:reset@example.com") == 1

    throttling.reset_login_attempts("reset@example.com")

    assert cache.get("login_attempts:reset@example.com") is None


def test_check_login_throttle_raises_after_limit_reached(monkeypatch):
    monkeypatch.setattr(throttling, "BLOCK_TIME", 5)

    for _ in range(throttling.LOGIN_ATTEMPT_LIMIT):
        throttling.increase_login_attempt("blocked@example.com")

    with pytest.raises(Throttled) as exc_info:
        throttling.check_login_throttle("blocked@example.com")

    assert exc_info.value.wait == 5


def test_login_attempt_counter_expires_after_block_time(monkeypatch):
    monkeypatch.setattr(throttling, "BLOCK_TIME", 1)

    for _ in range(throttling.LOGIN_ATTEMPT_LIMIT):
        throttling.increase_login_attempt("expires@example.com")

    with pytest.raises(Throttled):
        throttling.check_login_throttle("expires@example.com")

    time.sleep(1.2)

    assert cache.get("login_attempts:expires@example.com") is None
    throttling.check_login_throttle("expires@example.com")
