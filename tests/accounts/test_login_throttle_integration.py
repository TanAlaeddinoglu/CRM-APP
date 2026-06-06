import time

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.middleware.csrf import get_token
from django.test.client import RequestFactory
from rest_framework import status
from rest_framework.test import APIClient

from accounts import throttling


pytestmark = pytest.mark.django_db

UNAUTHORIZED_STATUSES = {
    status.HTTP_401_UNAUTHORIZED,
    status.HTTP_403_FORBIDDEN,
}


@pytest.fixture(autouse=True)
def clear_default_cache():
    cache.clear()
    yield
    cache.clear()


def _login_with_csrf(client: APIClient, data: dict, **extra):
    request = RequestFactory().get("/")
    header_token = get_token(request)
    cookie_token = request.META.get("CSRF_COOKIE")
    client.cookies["csrftoken"] = cookie_token
    return client.post(
        "/api/accounts/login/",
        data,
        format="json",
        HTTP_X_CSRFTOKEN=header_token,
        **extra,
    )


def test_invalid_login_increments_cached_attempt_counter():
    client = APIClient()

    response = _login_with_csrf(
        client,
        {"username": "missing-user", "password": "WrongPass123!"},
    )

    assert response.status_code in UNAUTHORIZED_STATUSES
    assert cache.get("login_attempts:user:missing-user") == 1


def test_successful_login_resets_cached_attempt_counter():
    user = get_user_model().objects.create_user(
        username="cache-reset-user",
        password="RightPass123!",
    )
    client = APIClient()

    for _ in range(2):
        _login_with_csrf(
            client,
            {"username": user.username, "password": "WrongPass123!"},
        )

    assert cache.get(f"login_attempts:user:{user.username}") == 2

    response = _login_with_csrf(
        client,
        {"username": user.username, "password": "RightPass123!"},
    )

    assert response.status_code == status.HTTP_200_OK
    assert cache.get(f"login_attempts:user:{user.username}") is None


def test_login_returns_throttled_response_after_limit_reached():
    client = APIClient()

    for _ in range(throttling.LOGIN_ATTEMPT_LIMIT):
        response = _login_with_csrf(
            client,
            {"username": "limited-user", "password": "WrongPass123!"},
        )
        assert response.status_code in UNAUTHORIZED_STATUSES

    throttled_response = _login_with_csrf(
        client,
        {"username": "limited-user", "password": "WrongPass123!"},
    )

    assert throttled_response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert throttled_response.data["detail"]


def test_login_is_allowed_again_after_cached_block_expires(monkeypatch):
    monkeypatch.setattr(throttling, "BLOCK_TIME", 1)
    client = APIClient()

    for _ in range(throttling.LOGIN_ATTEMPT_LIMIT):
        response = _login_with_csrf(
            client,
            {"username": "temporary-block-user", "password": "WrongPass123!"},
        )
        assert response.status_code in UNAUTHORIZED_STATUSES

    blocked_response = _login_with_csrf(
        client,
        {"username": "temporary-block-user", "password": "WrongPass123!"},
    )
    assert blocked_response.status_code == status.HTTP_429_TOO_MANY_REQUESTS

    time.sleep(1.2)

    retry_response = _login_with_csrf(
        client,
        {"username": "temporary-block-user", "password": "WrongPass123!"},
    )

    assert retry_response.status_code in UNAUTHORIZED_STATUSES
    assert cache.get("login_attempts:user:temporary-block-user") == 1


def test_login_throttle_blocks_many_usernames_from_same_ip(monkeypatch):
    monkeypatch.setattr(throttling, "IP_ATTEMPT_LIMIT", 3)
    client = APIClient()

    for idx in range(throttling.IP_ATTEMPT_LIMIT):
        response = _login_with_csrf(
            client,
            {"username": f"user-{idx}", "password": "WrongPass123!"},
            REMOTE_ADDR="203.0.113.10",
        )
        assert response.status_code in UNAUTHORIZED_STATUSES

    throttled_response = _login_with_csrf(
        client,
        {"username": "another-user", "password": "WrongPass123!"},
        REMOTE_ADDR="203.0.113.10",
    )

    assert throttled_response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert cache.get("login_attempts:ip:203.0.113.10") == throttling.IP_ATTEMPT_LIMIT
