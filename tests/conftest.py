import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.middleware.csrf import get_token
from django.test.client import RequestFactory
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def rf():
    return RequestFactory()


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        username="admin",
        email="admin@example.com",
        password="AdminPass123!",
    )


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        username="staff",
        email="staff@example.com",
        password="StaffPass123!",
        is_staff=True,
    )


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(
        username="user",
        email="user@example.com",
        password="UserPass123!",
    )


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def regular_client(regular_user):
    client = APIClient()
    client.force_authenticate(user=regular_user)
    return client


@pytest.fixture
def csrf_tokens(rf):
    request = rf.get("/")
    header_token = get_token(request)
    cookie_token = request.META.get("CSRF_COOKIE")
    return cookie_token, header_token


@pytest.fixture
def csrf_post(api_client, csrf_tokens):
    def _post(url, data):
        cookie_token, header_token = csrf_tokens
        api_client.cookies[settings.CSRF_COOKIE_NAME] = cookie_token
        return api_client.post(
            url,
            data,
            format="json",
            HTTP_X_CSRFTOKEN=header_token,
        )

    return _post
