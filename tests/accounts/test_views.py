import json
from datetime import timedelta

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.middleware.csrf import get_token
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.utils import datetime_to_epoch

from accounts.views import (
    CookieTokenRefreshView,
    LogoutView,
    ProfileView,
    UserLoginView,
    UserViewSetListCreate,
    csrf_token_view,
)

pytestmark = pytest.mark.django_db

User = get_user_model()


def _jwt_settings(**overrides):
    updated = dict(settings.SIMPLE_JWT)
    updated.update(overrides)
    return updated


def _csrf_request(factory, data):
    request = factory.post("/login/", data, format="json")
    token = get_token(request)
    request.META["HTTP_X_CSRFTOKEN"] = token
    return request


def test_user_login_view_success_updates_last_login():
    user = User.objects.create_user(username="jane", password="Pass12345!")
    factory = APIRequestFactory()
    request = _csrf_request(factory, {"username": "jane", "password": "Pass12345!"})
    response = UserLoginView.as_view()(request)

    assert response.status_code == status.HTTP_200_OK
    assert "access" in response.data["data"]
    assert settings.SIMPLE_JWT["AUTH_COOKIE"] in response.cookies
    user.refresh_from_db()
    assert user.last_login is not None


def test_user_login_view_invalid_credentials_raises():
    User.objects.create_user(username="bad", password="Right123!")
    factory = APIRequestFactory()
    request = _csrf_request(factory, {"username": "bad", "password": "Wrong123!"})
    response = UserLoginView.as_view()(request)
    assert response.status_code in {
        status.HTTP_401_UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN,
    }


def test_logout_view_blacklists_refresh_token():
    user = User.objects.create_user(username="logout", password="pass")
    refresh = RefreshToken.for_user(user)
    factory = APIRequestFactory()
    request = factory.post("/logout/")
    request.COOKIES[settings.SIMPLE_JWT["AUTH_COOKIE_REFRESH_TOKEN"]] = str(refresh)

    response = LogoutView.as_view()(request)

    assert response.status_code == status.HTTP_200_OK
    assert settings.SIMPLE_JWT["AUTH_COOKIE"] in response.cookies
    assert BlacklistedToken.objects.filter(token__jti=refresh["jti"]).exists()


def test_cookie_token_refresh_view_missing_cookie():
    factory = APIRequestFactory()
    request = factory.post("/token/refresh/")
    response = CookieTokenRefreshView.as_view()(request)
    assert response.status_code in {
        status.HTTP_401_UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN,
    }


def test_cookie_token_refresh_view_sets_access_cookie():
    user = User.objects.create_user(username="refresh", password="pass")
    refresh = RefreshToken.for_user(user)
    factory = APIRequestFactory()
    request = factory.post("/token/refresh/")
    request.COOKIES["refresh_token"] = str(refresh)
    response = CookieTokenRefreshView.as_view()(request)

    assert response.status_code == status.HTTP_200_OK
    assert settings.SIMPLE_JWT["AUTH_COOKIE"] in response.cookies


@override_settings(
    SIMPLE_JWT=_jwt_settings(
        ACCESS_TOKEN_LIFETIME=timedelta(minutes=30),
        REFRESH_TOKEN_LIFETIME=timedelta(days=1),
    )
)
def test_refresh_allows_active_user_within_refresh_lifetime():
    user = User.objects.create_user(username="active", password="pass")
    refresh = RefreshToken.for_user(user)
    refresh["exp"] = datetime_to_epoch(timezone.now() + timedelta(days=1))
    token = str(refresh)

    factory = APIRequestFactory()
    for _ in range(2):
        request = factory.post("/token/refresh/")
        request.COOKIES[settings.SIMPLE_JWT["AUTH_COOKIE_REFRESH_TOKEN"]] = token
        response = CookieTokenRefreshView.as_view()(request)
        assert response.status_code == status.HTTP_200_OK
        assert settings.SIMPLE_JWT["AUTH_COOKIE"] in response.cookies


@override_settings(
    SIMPLE_JWT=_jwt_settings(
        ACCESS_TOKEN_LIFETIME=timedelta(minutes=30),
        REFRESH_TOKEN_LIFETIME=timedelta(days=1),
    )
)
def test_refresh_rejects_inactive_user_after_refresh_expiry():
    user = User.objects.create_user(username="inactive", password="pass")
    refresh = RefreshToken.for_user(user)
    refresh["exp"] = datetime_to_epoch(timezone.now() - timedelta(seconds=1))
    factory = APIRequestFactory()
    request = factory.post("/token/refresh/")
    request.COOKIES[settings.SIMPLE_JWT["AUTH_COOKIE_REFRESH_TOKEN"]] = str(refresh)
    response = CookieTokenRefreshView.as_view()(request)

    assert response.status_code in {
        status.HTTP_401_UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN,
    }


def test_profile_view_returns_user_data():
    user = User.objects.create_user(username="profile", password="pass")
    factory = APIRequestFactory()
    request = factory.get("/profile/")
    force_authenticate(request, user=user)
    response = ProfileView.as_view()(request)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["username"] == "profile"


def test_csrf_token_view_returns_token():
    factory = APIRequestFactory()
    response = csrf_token_view(factory.get("/csrf/"))
    payload = json.loads(response.content)
    assert "csrfToken" in payload


def test_user_list_create_requires_password(admin_user):
    factory = APIRequestFactory()
    request = factory.post("/users/", {"username": "nopass"}, format="json")
    force_authenticate(request, user=admin_user)
    response = UserViewSetListCreate.as_view()(request)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "password" in response.data
