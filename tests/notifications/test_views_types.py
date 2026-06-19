import pytest
from rest_framework import status


pytestmark = pytest.mark.django_db

TYPES_URL = "/api/notifications/types/"


def test_list_types_requires_auth(api_client):
    response = api_client.get(TYPES_URL)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_list_types_accessible_by_regular_user(regular_client):
    response = regular_client.get(TYPES_URL)
    assert response.status_code == status.HTTP_200_OK


def test_list_types_accessible_by_admin(admin_client):
    response = admin_client.get(TYPES_URL)
    assert response.status_code == status.HTTP_200_OK


def test_list_types_returns_registered_types(regular_client):
    response = regular_client.get(TYPES_URL)
    assert response.status_code == status.HTTP_200_OK
    keys = [t["key"] for t in response.data]
    assert "events.appointment_created" in keys
    assert "events.appointment_status_updated" in keys


def test_type_serializer_fields(regular_client):
    response = regular_client.get(TYPES_URL)
    assert response.status_code == status.HTTP_200_OK
    t = response.data[0]
    assert "key" in t
    assert "label" in t
    assert "app_label" in t
    assert "default_channels" in t
    assert "default_title_template" in t
    assert "default_body_template" in t


def test_list_types_is_read_only(admin_client):
    """Types endpoint yalnızca GET destekler."""
    response = admin_client.post(TYPES_URL, {}, format="json")
    assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
