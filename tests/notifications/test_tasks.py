import pytest

from notifications.tasks import dispatch_notification_task


pytestmark = pytest.mark.django_db


def test_dispatch_task_calls_dispatcher(monkeypatch):
    calls = []

    def mock_dispatch(
        self, event_key, payload, recipient_ids, content_type_id, object_id
    ):
        calls.append(
            {
                "event_key": event_key,
                "payload": payload,
                "recipient_ids": recipient_ids,
            }
        )

    monkeypatch.setattr(
        "notifications.services.dispatcher.NotificationDispatchService.dispatch",
        mock_dispatch,
    )

    dispatch_notification_task.apply(
        args=[
            "events.appointment_created",
            {"appointment_name": "Test"},
            [1],
            None,
            None,
        ]
    )

    assert len(calls) == 1
    assert calls[0]["event_key"] == "events.appointment_created"
    assert calls[0]["recipient_ids"] == [1]


def test_dispatch_task_retries_on_exception(monkeypatch):
    """CELERY_TASK_ALWAYS_EAGER=True ile retry, Retry exception fırlatır."""
    import celery.exceptions

    attempt_count = [0]

    def failing_dispatch(self, *args, **kwargs):
        attempt_count[0] += 1
        raise RuntimeError("Geçici hata")

    monkeypatch.setattr(
        "notifications.services.dispatcher.NotificationDispatchService.dispatch",
        failing_dispatch,
    )

    # Eager modda ilk retry anında Retry exception fırlatılır
    with pytest.raises((celery.exceptions.Retry, RuntimeError)):
        dispatch_notification_task.apply(
            args=["events.appointment_created", {}, [1], None, None]
        )

    assert attempt_count[0] >= 1


def test_dispatch_task_with_none_recipient_ids(monkeypatch):
    """recipient_ids=None (resolver path) task'a iletilebilmeli."""
    calls = []

    def mock_dispatch(
        self, event_key, payload, recipient_ids, content_type_id, object_id
    ):
        calls.append(recipient_ids)

    monkeypatch.setattr(
        "notifications.services.dispatcher.NotificationDispatchService.dispatch",
        mock_dispatch,
    )

    dispatch_notification_task.apply(
        args=["events.appointment_created", {}, None, None, None]
    )

    assert calls[0] is None
