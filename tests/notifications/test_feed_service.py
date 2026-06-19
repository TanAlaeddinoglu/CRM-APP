import pytest
from django.utils import timezone
from datetime import timedelta

from notifications.models import Notification, NotificationRule
from notifications.services.feed import NotificationFeedService


pytestmark = pytest.mark.django_db


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
        n.refresh_from_db()
    return n


# ── list_for_user ─────────────────────────────────────────────────────────────


def test_list_for_user_returns_only_own_notifications(regular_user, second_user, rule):
    make_notification(regular_user, rule)
    make_notification(second_user, rule)
    qs = NotificationFeedService.list_for_user(regular_user)
    assert qs.count() == 1
    assert qs.first().recipient == regular_user


def test_list_for_user_filter_is_read_true(regular_user, rule):
    make_notification(regular_user, rule, is_read=False)
    make_notification(regular_user, rule, is_read=True)
    qs = NotificationFeedService.list_for_user(regular_user, is_read=True)
    assert qs.count() == 1
    assert qs.first().is_read is True


def test_list_for_user_filter_is_read_false(regular_user, rule):
    make_notification(regular_user, rule, is_read=False)
    make_notification(regular_user, rule, is_read=True)
    qs = NotificationFeedService.list_for_user(regular_user, is_read=False)
    assert qs.count() == 1
    assert qs.first().is_read is False


def test_list_for_user_filter_created_after(regular_user, rule):
    old = make_notification(regular_user, rule, days_ago=10)
    recent = make_notification(regular_user, rule, days_ago=1)
    cutoff = timezone.now() - timedelta(days=5)
    qs = NotificationFeedService.list_for_user(regular_user, created_after=cutoff)
    pks = list(qs.values_list("pk", flat=True))
    assert recent.pk in pks
    assert old.pk not in pks


def test_list_for_user_filter_created_before(regular_user, rule):
    old = make_notification(regular_user, rule, days_ago=10)
    recent = make_notification(regular_user, rule, days_ago=1)
    cutoff = timezone.now() - timedelta(days=5)
    qs = NotificationFeedService.list_for_user(regular_user, created_before=cutoff)
    pks = list(qs.values_list("pk", flat=True))
    assert old.pk in pks
    assert recent.pk not in pks


# ── mark_read ─────────────────────────────────────────────────────────────────


def test_mark_read_sets_is_read_and_read_at(regular_user, rule):
    n = make_notification(regular_user, rule, is_read=False)
    NotificationFeedService.mark_read(n, regular_user)
    n.refresh_from_db()
    assert n.is_read is True
    assert n.read_at is not None


def test_mark_read_idempotent_when_already_read(regular_user, rule):
    n = make_notification(regular_user, rule, is_read=True)
    original_read_at = n.read_at
    NotificationFeedService.mark_read(n, regular_user)
    n.refresh_from_db()
    assert n.read_at == original_read_at  # değişmemeli


def test_mark_read_wrong_user_raises_permission_error(regular_user, second_user, rule):
    n = make_notification(regular_user, rule)
    with pytest.raises(PermissionError):
        NotificationFeedService.mark_read(n, second_user)


# ── mark_all_read ─────────────────────────────────────────────────────────────


def test_mark_all_read_returns_correct_count(regular_user, rule):
    make_notification(regular_user, rule, is_read=False)
    make_notification(regular_user, rule, is_read=False)
    make_notification(regular_user, rule, is_read=True)
    count = NotificationFeedService.mark_all_read(regular_user)
    assert count == 2


def test_mark_all_read_only_affects_own_notifications(regular_user, second_user, rule):
    make_notification(regular_user, rule, is_read=False)
    make_notification(second_user, rule, is_read=False)
    NotificationFeedService.mark_all_read(regular_user)
    assert Notification.objects.get(recipient=second_user).is_read is False


# ── unread_count ──────────────────────────────────────────────────────────────


def test_unread_count_returns_correct_number(regular_user, rule):
    make_notification(regular_user, rule, is_read=False)
    make_notification(regular_user, rule, is_read=False)
    make_notification(regular_user, rule, is_read=True)
    assert NotificationFeedService.unread_count(regular_user) == 2


def test_unread_count_zero_when_all_read(regular_user, rule):
    make_notification(regular_user, rule, is_read=True)
    assert NotificationFeedService.unread_count(regular_user) == 0
