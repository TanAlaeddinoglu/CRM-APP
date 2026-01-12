import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.middleware.csrf import get_token
from django.test.client import RequestFactory
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.authenticate import CustomAuthentication, enforce_csrf

pytestmark = pytest.mark.django_db

User = get_user_model()


def test_enforce_csrf_rejects_missing_token():
    request = RequestFactory().post("/login/")
    with pytest.raises(PermissionDenied):
        enforce_csrf(request)


def test_enforce_csrf_accepts_valid_token():
    request = RequestFactory().post("/login/")
    header_token = get_token(request)
    request.META["CSRF_COOKIE"] = header_token
    request.COOKIES[settings.CSRF_COOKIE_NAME] = header_token
    request.META["HTTP_X_CSRFTOKEN"] = header_token
    enforce_csrf(request)


def test_custom_authentication_returns_none_without_token():
    request = RequestFactory().get("/profile/")
    auth = CustomAuthentication()
    assert auth.authenticate(request) is None


def test_custom_authentication_uses_cookie_token():
    user = User.objects.create_user(username="cookie", password="pass")
    access = RefreshToken.for_user(user).access_token
    request = RequestFactory().get("/profile/")
    request.COOKIES[settings.SIMPLE_JWT["AUTH_COOKIE"]] = str(access)
    auth = CustomAuthentication()
    result = auth.authenticate(request)
    assert result is not None
    assert result[0].id == user.id
