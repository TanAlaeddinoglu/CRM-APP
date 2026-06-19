import pytest
from rest_framework import status

from notifications.models import NotificationRule


pytestmark = pytest.mark.django_db

RULES_URL = "/api/notifications/rules/"


def rule_detail_url(pk):
    return f"/api/notifications/rules/{pk}/"


# ── GET /api/notifications/rules/ ────────────────────────────────────────────


def test_list_rules_requires_admin(regular_client):
    response = regular_client.get(RULES_URL)
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_list_rules_returns_all_rules(admin_client, active_rule, system_rule):
    response = admin_client.get(RULES_URL)
    assert response.status_code == status.HTTP_200_OK
    pks = [r["id"] for r in response.data]
    assert active_rule.pk in pks
    assert system_rule.pk in pks


def test_list_rules_unauthenticated(api_client):
    response = api_client.get(RULES_URL)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ── POST /api/notifications/rules/ ───────────────────────────────────────────


def test_create_rule_success(admin_client):
    payload = {
        "type_key": "events.appointment_created",
        "name": "Yeni kural",
        "channels": ["in_app"],
    }
    response = admin_client.post(RULES_URL, payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["name"] == "Yeni kural"
    assert NotificationRule.objects.filter(name="Yeni kural").exists()


def test_create_rule_invalid_type_key_returns_400(admin_client):
    payload = {
        "type_key": "nonexistent.key",
        "name": "Geçersiz",
        "channels": ["in_app"],
    }
    response = admin_client.post(RULES_URL, payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_create_rule_invalid_channel_returns_400(admin_client):
    payload = {
        "type_key": "events.appointment_created",
        "name": "Geçersiz kanal",
        "channels": ["nonexistent_channel"],
    }
    response = admin_client.post(RULES_URL, payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_create_rule_requires_admin(regular_client):
    payload = {
        "type_key": "events.appointment_created",
        "name": "Yeni kural",
        "channels": ["in_app"],
    }
    response = regular_client.post(RULES_URL, payload, format="json")
    assert response.status_code == status.HTTP_403_FORBIDDEN


# ── GET /api/notifications/rules/<pk>/ ───────────────────────────────────────


def test_get_rule_detail_admin_only(admin_client, regular_client, active_rule):
    url = rule_detail_url(active_rule.pk)
    assert admin_client.get(url).status_code == status.HTTP_200_OK
    assert regular_client.get(url).status_code == status.HTTP_403_FORBIDDEN


def test_get_rule_detail_not_found(admin_client):
    response = admin_client.get(rule_detail_url(99999))
    assert response.status_code == status.HTTP_404_NOT_FOUND


# ── PATCH /api/notifications/rules/<pk>/ ─────────────────────────────────────


def test_update_rule_success(admin_client, active_rule):
    url = rule_detail_url(active_rule.pk)
    response = admin_client.patch(
        url, {"name": "Güncellendi", "is_active": False}, format="json"
    )
    assert response.status_code == status.HTTP_200_OK
    active_rule.refresh_from_db()
    assert active_rule.name == "Güncellendi"
    assert active_rule.is_active is False


def test_update_system_default_name_returns_400(admin_client, system_rule):
    url = rule_detail_url(system_rule.pk)
    response = admin_client.patch(url, {"name": "Değiştir"}, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_update_rule_requires_admin(regular_client, active_rule):
    url = rule_detail_url(active_rule.pk)
    response = regular_client.patch(url, {"name": "Hacker"}, format="json")
    assert response.status_code == status.HTTP_403_FORBIDDEN


# ── DELETE /api/notifications/rules/<pk>/ ────────────────────────────────────


def test_delete_custom_rule_success(admin_client, active_rule):
    url = rule_detail_url(active_rule.pk)
    response = admin_client.delete(url)
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not NotificationRule.objects.filter(pk=active_rule.pk).exists()


def test_delete_system_default_returns_400(admin_client, system_rule):
    url = rule_detail_url(system_rule.pk)
    response = admin_client.delete(url)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert NotificationRule.objects.filter(pk=system_rule.pk).exists()


def test_delete_rule_requires_admin(regular_client, active_rule):
    url = rule_detail_url(active_rule.pk)
    response = regular_client.delete(url)
    assert response.status_code == status.HTTP_403_FORBIDDEN
