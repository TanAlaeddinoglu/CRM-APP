import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
def test_user_login_successful(csrf_post, login_url, django_user_model):
    django_user_model.objects.create_user(
        username="johndoe",
        email="john@example.com",
        password="Password123!",
    )

    response = csrf_post(
        login_url,
        {"username": "johndoe", "password": "Password123!"},
    )

    assert response.status_code == status.HTTP_200_OK
    assert "Success" in response.data
    assert "data" in response.data
    assert "access" in response.data["data"]
    assert "refresh" in response.data["data"]


@pytest.mark.django_db
def test_admin_can_create_user(admin_client, user_list_url):
    payload = {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "NewUserPass123!",
        "role": "USER",
    }

    response = admin_client.post(user_list_url, payload, format="json")

    assert response.status_code == status.HTTP_201_CREATED
    assert "id" in response.data


@pytest.mark.django_db
def test_admin_can_delete_user(admin_client, django_user_model):
    user = django_user_model.objects.create_user(
        username="delete-me",
        email="delete@example.com",
        password="DeleteMe123!",
    )

    url = reverse("user-detail", args=[user.pk])
    response = admin_client.delete(url)

    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not django_user_model.objects.filter(pk=user.pk).exists()


@pytest.mark.django_db
def test_admin_can_update_user(admin_client, django_user_model):
    user = django_user_model.objects.create_user(
        username="updatable",
        email="updatable@example.com",
        password="UpdateMe123!",
    )

    url = reverse("user-detail", args=[user.pk])
    payload = {
        "username": "updated-user",
        "email": "updated@example.com",
        "password": "UpdatedPass123!",
        "role": "ADMIN",
    }
    response = admin_client.put(url, payload, format="json")

    assert response.status_code == status.HTTP_200_OK
    user.refresh_from_db()
    assert user.username == "updated-user"
    assert user.email == "updated@example.com"
    assert user.role == "ADMIN"
    assert user.check_password("UpdatedPass123!")


@pytest.mark.django_db
def test_admin_can_change_user_password(admin_client, django_user_model):
    user = django_user_model.objects.create_user(
        username="change-pass",
        email="changepass@example.com",
        password="InitialPass123!",
    )

    url = reverse("user-detail", args=[user.pk])
    new_password = "ChangedPass456!"
    response = admin_client.patch(
        url,
        {"password": new_password},
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    user.refresh_from_db()
    assert user.check_password(new_password)


@pytest.mark.django_db
def test_admin_can_list_users(admin_client, user_list_url, admin_user):
    response = admin_client.get(user_list_url)

    assert response.status_code == status.HTTP_200_OK
    assert any(user["username"] == admin_user.username for user in response.data)


@pytest.mark.django_db
def test_user_viewset_requires_admin(regular_client, user_list_url):
    response = regular_client.get(user_list_url)

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_create_user_without_password_fails(admin_client, user_list_url):
    response = admin_client.post(
        user_list_url,
        {"username": "nopass", "email": "nopass@example.com"},
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "password" in response.data


@pytest.mark.django_db
def test_login_with_invalid_credentials_fails(csrf_post, login_url, django_user_model):
    django_user_model.objects.create_user(
        username="badlogin",
        email="bad@example.com",
        password="RightPass123!",
    )

    response = csrf_post(
        login_url,
        {"username": "badlogin", "password": "WrongPass!"},
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "detail" in response.data


@pytest.mark.django_db
def test_admin_can_delete_all_users(admin_client, user_list_url, django_user_model):
    django_user_model.objects.create_user(
        username="user1", email="u1@example.com", password="pass12345"
    )
    django_user_model.objects.create_user(
        username="user2", email="u2@example.com", password="pass12345"
    )

    response = admin_client.delete(user_list_url)

    assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
    assert django_user_model.objects.filter(is_superuser=False).count() >= 2
