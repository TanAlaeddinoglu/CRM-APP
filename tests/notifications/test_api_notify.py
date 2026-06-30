import pytest

from notifications.api import notify


pytestmark = pytest.mark.django_db


@pytest.fixture
def mock_delay(monkeypatch):
    calls = []

    def fake_delay(*args, **kwargs):
        calls.append(args)

    monkeypatch.setattr(
        "notifications.tasks.dispatch_notification_task.delay", fake_delay
    )
    return calls


def test_notify_with_explicit_recipients_queues_task(mock_delay, regular_user):
    notify("events.appointment_created", payload={"x": 1}, recipients=[regular_user])
    assert len(mock_delay) == 1
    event_key, payload, recipient_ids, ct_id, obj_id, channels, *_ = mock_delay[0]
    assert event_key == "events.appointment_created"
    assert recipient_ids == [regular_user.pk]


def test_notify_with_empty_recipients_does_not_queue(mock_delay):
    notify("events.appointment_created", payload={}, recipients=[])
    assert len(mock_delay) == 0


def test_notify_without_recipients_queues_with_none(mock_delay):
    notify("events.appointment_created", payload={})
    assert len(mock_delay) == 1
    _, _, recipient_ids, _, _, *_ = mock_delay[0]
    assert recipient_ids is None


def test_notify_resolves_content_type_for_target(mock_delay, regular_user, active_rule):
    notify(
        "events.appointment_created",
        payload={},
        recipients=[regular_user],
        target=active_rule,
    )
    _, _, _, content_type_id, object_id, *_ = mock_delay[0]
    assert content_type_id is not None
    assert object_id == active_rule.pk


def test_notify_target_none_passes_none_ids(mock_delay, regular_user):
    notify(
        "events.appointment_created", payload={}, recipients=[regular_user], target=None
    )
    _, _, _, content_type_id, object_id, *_ = mock_delay[0]
    assert content_type_id is None
    assert object_id is None


def test_notify_accepts_raw_int_recipient_ids(mock_delay, regular_user):
    notify("events.appointment_created", payload={}, recipients=[regular_user.pk])
    _, _, recipient_ids, _, _, *_ = mock_delay[0]
    assert recipient_ids == [regular_user.pk]
