from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import CustomUser


class UserAPITestCase(APITestCase):
    def setUp(self):
        self.admin_password = "AdminPass123!"
        self.admin = CustomUser.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password=self.admin_password,
        )
        self.login_url = reverse("login-user")
        self.user_list_url = reverse("user-list-create")

    def authenticate_admin(self):
        self.client.force_authenticate(user=self.admin)

    def test_user_login_successful(self):
        CustomUser.objects.create_user(
            username="johndoe",
            email="john@example.com",
            password="Password123!",
        )

        response = self.client.post(
            self.login_url,
            {"username": "johndoe", "password": "Password123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Success", response.data)
        self.assertIn("data", response.data)
        self.assertIn("access", response.data["data"])
        self.assertIn("refresh", response.data["data"])

    def test_admin_can_create_user(self):
       # self.authenticate_admin()

        payload = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "NewUserPass123!",
            "role": CustomUser.Role.USER,
        }
        response = self.client.post(self.user_list_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(CustomUser.objects.filter(username="newuser").exists())

    def test_admin_can_delete_user(self):
        #self.authenticate_admin()
        user = CustomUser.objects.create_user(
            username="delete-me",
            email="delete@example.com",
            password="DeleteMe123!",
        )

        url = reverse("user-detail", args=[user.pk])
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CustomUser.objects.filter(pk=user.pk).exists())

    def test_admin_can_update_user(self):
       # self.authenticate_admin()
        user = CustomUser.objects.create_user(
            username="updatable",
            email="updatable@example.com",
            password="UpdateMe123!",
        )

        url = reverse("user-detail", args=[user.pk])
        payload = {
            "username": "updated-user",
            "email": "updated@example.com",
            "password": "UpdatedPass123!",
            "role": CustomUser.Role.ADMIN,
        }
        response = self.client.put(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.username, "updated-user")
        self.assertEqual(user.email, "updated@example.com")
        self.assertEqual(user.role, CustomUser.Role.ADMIN)
        self.assertTrue(user.check_password("UpdatedPass123!"))

    def test_admin_can_change_user_password(self):
       # self.authenticate_admin()
        user = CustomUser.objects.create_user(
            username="change-pass",
            email="changepass@example.com",
            password="InitialPass123!",
        )

        url = reverse("user-detail", args=[user.pk])
        new_password = "ChangedPass456!"
        response = self.client.patch(
            url,
            {"password": new_password},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.check_password(new_password))

    def test_admin_can_list_users(self):
        #self.authenticate_admin()
        CustomUser.objects.create_user(
            username="listable",
            email="listable@example.com",
            password="Listable123!",
        )

        response = self.client.get(self.user_list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        usernames = {user["username"] for user in response.data}
        self.assertIn("admin", usernames)

    def test_user_viewset_requires_admin(self):
        regular_user = CustomUser.objects.create_user(
            username="regular",
            email="regular@example.com",
            password="Regular123!",
        )
        #self.client.force_authenticate(user=regular_user)

        response = self.client.get(self.user_list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_user_without_password_fails(self):
        self.authenticate_admin()

        response = self.client.post(
            self.user_list_url,
            {"username": "nopass", "email": "nopass@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

    def test_login_with_invalid_credentials_fails(self):
        CustomUser.objects.create_user(
            username="badlogin",
            email="bad@example.com",
            password="RightPass123!",
        )

        response = self.client.post(
            self.login_url,
            {"username": "badlogin", "password": "WrongPass!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("Invalid", response.data)
