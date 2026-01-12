import pytest
from django.contrib.auth import get_user_model
from rest_framework.exceptions import AuthenticationFailed

from accounts.serializers import CustomUserSerializer, UserLoginSerializer

pytestmark = pytest.mark.django_db

User = get_user_model()


def test_custom_user_serializer_creates_hashed_password():
    serializer = CustomUserSerializer(
        data={"username": "sam", "password": "Secret123!"}
    )
    assert serializer.is_valid(), serializer.errors
    user = serializer.save()
    assert user.check_password("Secret123!")
    assert user.password != "Secret123!"


def test_custom_user_serializer_updates_password():
    user = User.objects.create_user(username="bob", password="OldPass123!")
    serializer = CustomUserSerializer(
        user, data={"password": "NewPass123!"}, partial=True
    )
    assert serializer.is_valid(), serializer.errors
    updated = serializer.save()
    assert updated.check_password("NewPass123!")


def test_user_login_serializer_valid_credentials():
    User.objects.create_user(username="loginuser", password="LoginPass123!")
    serializer = UserLoginSerializer(
        data={"username": "loginuser", "password": "LoginPass123!"}
    )
    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data.username == "loginuser"


def test_user_login_serializer_invalid_credentials():
    User.objects.create_user(username="badlogin", password="RightPass123!")
    serializer = UserLoginSerializer(
        data={"username": "badlogin", "password": "WrongPass123!"}
    )
    with pytest.raises(AuthenticationFailed):
        serializer.is_valid(raise_exception=True)
