from datetime import timedelta

import pytest
from rest_framework import status

from notifications.reminders.models import ReminderOffset, ReminderRule

pytestmark = pytest.mark.django_db

RULES_URL = "/api/notifications/reminders/rules/"
FIELDS_URL = "/api/notifications/reminders/condition-fields/"

TYPE_HATIRLATMA = "hatirlatma"
STATUS_BEKLEMEDE = "beklemede"


def rule_url(pk):
    return f"/api/notifications/reminders/rules/{pk}/"


def valid_payload(**overrides):
    payload = {
        "name": "1 gün önce hatırlat",
        "is_active": True,
        "channels": ["in_app"],
        "notify_assigned_user": True,
        "notify_admins": False,
        "conditions": [{"field_name": "appointment_type", "value": TYPE_HATIRLATMA}],
        "offsets": [{"amount": 1, "unit": "days", "direction": "before"}],
    }
    payload.update(overrides)
    return payload


# ── Permissions ──────────────────────────────────────────────────────────────


def test_list_requires_admin(regular_client):
    assert regular_client.get(RULES_URL).status_code == status.HTTP_403_FORBIDDEN


def test_list_unauthenticated(api_client):
    assert api_client.get(RULES_URL).status_code == status.HTTP_401_UNAUTHORIZED


def test_condition_fields_endpoint(admin_client):
    response = admin_client.get(FIELDS_URL)
    assert response.status_code == status.HTTP_200_OK
    names = {f["name"] for f in response.data}
    assert names == {"appointment_type", "status"}
    appt_type = next(f for f in response.data if f["name"] == "appointment_type")
    values = {c["value"] for c in appt_type["choices"]}
    assert TYPE_HATIRLATMA in values


# ── Create ───────────────────────────────────────────────────────────────────


def test_create_rule_with_nested_children(admin_client):
    response = admin_client.post(RULES_URL, valid_payload(), format="json")
    assert response.status_code == status.HTTP_201_CREATED
    rule = ReminderRule.objects.get(name="1 gün önce hatırlat")
    assert rule.conditions.count() == 1
    assert rule.offsets.count() == 1
    offset = rule.offsets.get()
    assert offset.duration == timedelta(days=1)
    assert offset.direction == ReminderOffset.Direction.BEFORE


def test_offset_round_trip_representation(admin_client):
    payload = valid_payload(
        offsets=[
            {"amount": 2, "unit": "hours", "direction": "after"},
            {"amount": 3, "unit": "days", "direction": "before"},
        ]
    )
    create = admin_client.post(RULES_URL, payload, format="json")
    assert create.status_code == status.HTTP_201_CREATED
    detail = admin_client.get(rule_url(create.data["id"]))
    offsets = {(o["amount"], o["unit"], o["direction"]) for o in detail.data["offsets"]}
    assert offsets == {(2, "hours", "after"), (3, "days", "before")}


def test_create_rejects_invalid_condition_value(admin_client):
    payload = valid_payload(
        conditions=[{"field_name": "appointment_type", "value": "bogus"}]
    )
    response = admin_client.post(RULES_URL, payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_create_rejects_disallowed_field(admin_client):
    payload = valid_payload(conditions=[{"field_name": "notes", "value": "x"}])
    response = admin_client.post(RULES_URL, payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_create_requires_at_least_one_offset(admin_client):
    response = admin_client.post(RULES_URL, valid_payload(offsets=[]), format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_create_requires_a_recipient_target(admin_client):
    payload = valid_payload(notify_assigned_user=False, notify_admins=False)
    response = admin_client.post(RULES_URL, payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_create_rejects_invalid_channel(admin_client):
    response = admin_client.post(
        RULES_URL, valid_payload(channels=["bogus"]), format="json"
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_create_allows_empty_conditions(admin_client):
    response = admin_client.post(RULES_URL, valid_payload(conditions=[]), format="json")
    assert response.status_code == status.HTTP_201_CREATED


# ── Update / Delete ──────────────────────────────────────────────────────────


def test_patch_recreates_children(admin_client):
    created = admin_client.post(RULES_URL, valid_payload(), format="json")
    pk = created.data["id"]
    patch = admin_client.patch(
        rule_url(pk),
        {
            "conditions": [
                {"field_name": "status", "value": STATUS_BEKLEMEDE},
            ],
            "offsets": [{"amount": 30, "unit": "minutes", "direction": "before"}],
        },
        format="json",
    )
    assert patch.status_code == status.HTTP_200_OK
    rule = ReminderRule.objects.get(pk=pk)
    assert [c.field_name for c in rule.conditions.all()] == ["status"]
    assert rule.offsets.get().duration == timedelta(minutes=30)


def test_patch_toggle_is_active_keeps_children(admin_client):
    created = admin_client.post(RULES_URL, valid_payload(), format="json")
    pk = created.data["id"]
    patch = admin_client.patch(rule_url(pk), {"is_active": False}, format="json")
    assert patch.status_code == status.HTTP_200_OK
    rule = ReminderRule.objects.get(pk=pk)
    assert rule.is_active is False
    assert rule.conditions.count() == 1  # çocuklar korunur
    assert rule.offsets.count() == 1


def test_delete_rule(admin_client):
    created = admin_client.post(RULES_URL, valid_payload(), format="json")
    pk = created.data["id"]
    assert admin_client.delete(rule_url(pk)).status_code == status.HTTP_204_NO_CONTENT
    assert not ReminderRule.objects.filter(pk=pk).exists()
