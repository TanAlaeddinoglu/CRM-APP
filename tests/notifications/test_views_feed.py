import pytest
from datetime import timedelta
from django.utils import timezone
from rest_framework import status

from notifications.models import Notification, NotificationRule


pytestmark = pytest.mark.django_db

FEED_URL = "/api/notifications/"
UNREAD_COUNT_URL = "/api/notifications/unread-count/"
MARK_ALL_READ_URL = "/api/notifications/mark-all-read/"


@pytest.fixture
def rule(db):
    return NotificationRule.objects.create(
        type_key="events.appointment_created",
        name="Test",
        channels=["in_app"],
        is_active=True,
    )


def make_notification(user, rule, is_read=False, days_ago=0):
    n = Notification.objects.create(
        recipient=user,
        type_key="events.appointment_created",
        rule=rule,
        title="Bildirim",
        body="Gövde",
        context_payload={},
        is_read=is_read,
    )
    if days_ago:
        Notification.objects.filter(pk=n.pk).update(
            created_at=timezone.now() - timedelta(days=days_ago)
        )
    return n


def mark_read_url(pk):
    return f"/api/notifications/{pk}/mark-read/"


# ── GET /api/notifications/ ───────────────────────────────────────────────────


def test_list_requires_auth(api_client):
    response = api_client.get(FEED_URL)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_list_returns_own_notifications(
    regular_client, regular_user, second_user, rule
):
    make_notification(regular_user, rule)
    make_notification(second_user, rule)
    response = regular_client.get(FEED_URL)
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 1


def test_list_filter_offset_weeks_zero_returns_last_7_days(
    regular_client, regular_user, rule
):
    recent = make_notification(regular_user, rule, days_ago=3)
    old = make_notification(regular_user, rule, days_ago=10)
    response = regular_client.get(FEED_URL, {"offset_weeks": 0})
    assert response.status_code == status.HTTP_200_OK
    pks = [n["id"] for n in response.data]
    assert recent.pk in pks
    assert old.pk not in pks


def test_list_filter_offset_weeks_one_returns_days_7_to_14(
    regular_client, regular_user, rule
):
    last_week = make_notification(regular_user, rule, days_ago=10)
    recent = make_notification(regular_user, rule, days_ago=3)
    response = regular_client.get(FEED_URL, {"offset_weeks": 1})
    assert response.status_code == status.HTTP_200_OK
    pks = [n["id"] for n in response.data]
    assert last_week.pk in pks
    assert recent.pk not in pks


def test_list_filter_is_read_false(regular_client, regular_user, rule):
    make_notification(regular_user, rule, is_read=False)
    make_notification(regular_user, rule, is_read=True)
    response = regular_client.get(FEED_URL, {"is_read": "false"})
    assert response.status_code == status.HTTP_200_OK
    assert all(not n["is_read"] for n in response.data)


def test_list_response_fields(regular_client, regular_user, rule):
    make_notification(regular_user, rule)
    response = regular_client.get(FEED_URL)
    assert response.status_code == status.HTTP_200_OK
    n = response.data[0]
    assert "id" in n
    assert "title" in n
    assert "body" in n
    assert "is_read" in n
    assert "created_at" in n


# ── GET /api/notifications/unread-count/ ─────────────────────────────────────


def test_unread_count_requires_auth(api_client):
    response = api_client.get(UNREAD_COUNT_URL)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_unread_count_returns_correct_value(regular_client, regular_user, rule):
    make_notification(regular_user, rule, is_read=False)
    make_notification(regular_user, rule, is_read=False)
    make_notification(regular_user, rule, is_read=True)
    response = regular_client.get(UNREAD_COUNT_URL)
    assert response.status_code == status.HTTP_200_OK
    assert response.data["unread_count"] == 2


# ── POST /api/notifications/<pk>/mark-read/ ───────────────────────────────────


def test_mark_read_requires_auth(api_client, regular_user, rule):
    n = make_notification(regular_user, rule)
    response = api_client.post(mark_read_url(n.pk))
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_mark_read_sets_is_read_true(regular_client, regular_user, rule):
    n = make_notification(regular_user, rule, is_read=False)
    response = regular_client.post(mark_read_url(n.pk))
    assert response.status_code == status.HTTP_200_OK
    n.refresh_from_db()
    assert n.is_read is True


def test_mark_read_another_users_notification_returns_404(
    regular_client, second_user, rule
):
    n = make_notification(second_user, rule)
    response = regular_client.post(mark_read_url(n.pk))
    assert response.status_code == status.HTTP_404_NOT_FOUND


# ── POST /api/notifications/mark-all-read/ ───────────────────────────────────


def test_mark_all_read_requires_auth(api_client):
    response = api_client.post(MARK_ALL_READ_URL)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_mark_all_read_returns_marked_count(regular_client, regular_user, rule):
    make_notification(regular_user, rule, is_read=False)
    make_notification(regular_user, rule, is_read=False)
    response = regular_client.post(MARK_ALL_READ_URL)
    assert response.status_code == status.HTTP_200_OK
    assert response.data["marked_read"] == 2
