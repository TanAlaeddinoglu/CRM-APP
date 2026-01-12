import pytest
from django.contrib.auth import get_user_model

pytestmark = pytest.mark.django_db

User = get_user_model()


def test_custom_user_is_admin_role():
    admin = User.objects.create_user(
        username="admin-role", password="pass", role="ADMIN"
    )
    user = User.objects.create_user(username="user-role", password="pass", role="USER")
    assert admin.is_admin()
    assert not user.is_admin()


def test_custom_user_is_admin_superuser():
    user = User.objects.create_superuser(
        username="root",
        email="root@example.com",
        password="pass",
    )
    assert user.is_admin()


def test_custom_user_save_sets_is_staff():
    user = User.objects.create_user(username="staffy", password="pass", role="USER")
    assert not user.is_staff
    user.role = "ADMIN"
    user.save()
    user.refresh_from_db()
    assert user.is_staff
    user.role = "USER"
    user.save()
    user.refresh_from_db()
    assert not user.is_staff


def test_custom_user_save_update_fields_includes_is_staff():
    user = User.objects.create_user(
        username="update-role", password="pass", role="USER"
    )
    user.role = "ADMIN"
    user.save(update_fields=["role"])
    user.refresh_from_db()
    assert user.is_staff


def test_custom_user_str():
    user = User.objects.create_user(username="alice", password="pass", role="USER")
    assert str(user) == "alice - USER"
