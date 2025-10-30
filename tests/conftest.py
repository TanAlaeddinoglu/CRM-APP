# tests/conftest.py
from django.contrib.auth import get_user_model
from customer.models import Customer, Tag
import pytest
from django.conf import settings
from django.middleware.csrf import get_token
from django.test.client import RequestFactory
from django.urls import reverse
from rest_framework.test import APIClient

User = get_user_model()


# ---------------- Accounts Test Fixtures ----------------
@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def csrf_pair():
    request = RequestFactory().get("/")
    header_token = get_token(request)
    cookie_token = request.META.get("CSRF_COOKIE")
    return cookie_token, header_token


@pytest.fixture
def csrf_post(api_client, csrf_pair):
    def _post(url, data):
        cookie_token, header_token = csrf_pair
        api_client.cookies[settings.CSRF_COOKIE_NAME] = cookie_token
        return api_client.post(
            url,
            data,
            format="json",
            HTTP_X_CSRFTOKEN=header_token,
        )

    return _post


@pytest.fixture
def admin_user(django_user_model):
    return django_user_model.objects.create_superuser(
        username="admin",
        email="admin@example.com",
        password="AdminPass123!",
    )


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def regular_user(django_user_model):
    return django_user_model.objects.create_user(
        username="regular",
        email="regular@example.com",
        password="Regular123!",
    )


@pytest.fixture
def regular_client(regular_user):
    client = APIClient()
    client.force_authenticate(user=regular_user)
    return client


@pytest.fixture
def login_url():
    return reverse("login-user")


@pytest.fixture
def user_list_url():
    return reverse("user-list-create")


# ---------------- Customers Test Fixtures ----------------
@pytest.fixture
def user(db):
    return User.objects.create_user(username="alice", password="pass")


@pytest.fixture
def admin(db):
    return User.objects.create_user(username="admin", password="pass", is_staff=True)


@pytest.fixture
def tag_a(db):
    return Tag.objects.create(tag_name="VIP")


@pytest.fixture
def tag_b(db):
    return Tag.objects.create(tag_name="Prospect")


@pytest.fixture
def customer(db, user):
    return Customer.objects.create(
        customer_name="John",
        customer_surname="Doe",
        customer_email="john@example.com",
        assigned_to=user,  # if you switched to M2M, adapt accordingly
        created_by=user,
    )
