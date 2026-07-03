from datetime import datetime, timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from common.utils import APPOINTMENT_TYPES, APPOINTMENT_STATUS
from customer.models import Customer
from events.models import Appointment
from notifications.models import Notification, NotificationRule
from notifications.reminders.models import (
    ReminderOffset,
    ReminderRule,
    ScheduledNotification,
)
from notifications.reminders import services
from notifications.reminders.tasks import poll_due_reminders
from products.models import Product

pytestmark = pytest.mark.django_db

User = get_user_model()

# Beyaz listedeki gerçek choices değerleri
TYPE_HATIRLATMA = "hatirlatma"
STATUS_BEKLEMEDE = APPOINTMENT_STATUS[0][0]  # "beklemede"
STATUS_SATIS = "satis"


@pytest.fixture(autouse=True)
def reminder_type_registered(db):
    """Hatırlatma bildirim tipini ve gönderim kuralını test boyunca hazır tutar."""
    import notifications.reminders.notification_types  # noqa


@pytest.fixture
def reminder_notif_rule(db):
    """Testlerde ReminderRule'a bağlanacak özel NotificationRule."""
    rule, _ = NotificationRule.objects.get_or_create(
        type_key=services.REMINDER_EVENT_KEY,
        is_system_default=False,
        defaults={
            "name": "Test Hatırlatma Kuralı",
            "title_template": "Hatırlatma: {appointment_name}",
            "body_template": "{appointment_name} — {time_phrase}.",
            "channels": ["in_app"],
            "is_active": True,
        },
    )
    return rule


@pytest.fixture
def creator(db):
    return User.objects.create_user(username="creator", password="pass")


@pytest.fixture
def assigned_user(db):
    return User.objects.create_user(
        username="assigned", email="assigned@example.com", password="pass"
    )


@pytest.fixture
def customer(creator, assigned_user):
    return Customer.objects.create(
        customer_name="A",
        customer_surname="B",
        customer_phone="1200000000",
        created_by=creator,
        assigned_to=assigned_user,
    )


@pytest.fixture
def product(creator):
    return Product.objects.create(name="Consult", created_by=creator)


def make_appointment(
    customer,
    product,
    creator,
    *,
    when=None,
    atype=TYPE_HATIRLATMA,
    status=STATUS_BEKLEMEDE
):
    when = when or (timezone.now() + timedelta(days=2))
    return Appointment.objects.create(
        name="Visit",
        scheduled_for=when,
        appointment_type=atype,
        status=status,
        customer=customer,
        product=product,
        created_by=creator,
    )


def make_rule(
    *,
    conditions=None,
    offsets=None,
    assigned=True,
    admins=False,
    active=True,
    notification_rule=None
):
    rule = ReminderRule.objects.create(
        name="R",
        is_active=active,
        notify_assigned_user=assigned,
        notify_admins=admins,
        notification_rule=notification_rule,
    )
    for field_name, value in conditions or []:
        rule.conditions.create(field_name=field_name, value=value)
    for duration, direction in offsets or []:
        rule.offsets.create(duration=duration, direction=direction)
    return rule


# ── Beyaz liste ───────────────────────────────────────────────────────────────


def test_allowed_condition_fields_exposes_type_and_status():
    fields = {f["name"]: f for f in services.allowed_condition_fields()}
    assert set(fields) == {"appointment_type", "status"}
    type_values = {c["value"] for c in fields["appointment_type"]["choices"]}
    assert type_values == {v for v, _ in APPOINTMENT_TYPES}


# ── Koşul eşleştirme (AND) ────────────────────────────────────────────────────


def test_rule_matches_requires_all_conditions(customer, product, creator):
    appt = make_appointment(
        customer, product, creator, atype=TYPE_HATIRLATMA, status=STATUS_BEKLEMEDE
    )
    rule = make_rule(
        conditions=[("appointment_type", TYPE_HATIRLATMA), ("status", STATUS_BEKLEMEDE)]
    )
    assert services.rule_matches(appt, rule) is True


def test_rule_does_not_match_when_one_condition_differs(customer, product, creator):
    appt = make_appointment(
        customer, product, creator, atype=TYPE_HATIRLATMA, status=STATUS_SATIS
    )
    rule = make_rule(
        conditions=[("appointment_type", TYPE_HATIRLATMA), ("status", STATUS_BEKLEMEDE)]
    )
    assert services.rule_matches(appt, rule) is False


# ── Offset matematiği + instance üretimi ──────────────────────────────────────


def test_generate_creates_one_row_per_offset_with_frozen_times(
    customer, product, creator
):
    when = timezone.make_aware(datetime(2030, 1, 10, 12, 0))
    appt = make_appointment(customer, product, creator, when=when)
    make_rule(
        conditions=[("appointment_type", TYPE_HATIRLATMA)],
        offsets=[
            (timedelta(days=1), ReminderOffset.Direction.BEFORE),
            (timedelta(hours=1), ReminderOffset.Direction.BEFORE),
            (timedelta(days=1), ReminderOffset.Direction.AFTER),
        ],
    )

    services.generate_for_appointment(appt)

    rows = ScheduledNotification.objects.filter(appointment=appt).order_by(
        "scheduled_at"
    )
    times = [r.scheduled_at for r in rows]
    assert times == [
        when - timedelta(days=1),
        when - timedelta(hours=1),
        when + timedelta(days=1),
    ]
    assert all(r.status == ScheduledNotification.Status.PENDING for r in rows)


def test_non_matching_rule_generates_nothing(customer, product, creator):
    appt = make_appointment(customer, product, creator, status=STATUS_SATIS)
    make_rule(
        conditions=[("status", STATUS_BEKLEMEDE)],
        offsets=[(timedelta(days=1), ReminderOffset.Direction.BEFORE)],
    )
    services.generate_for_appointment(appt)
    assert ScheduledNotification.objects.filter(appointment=appt).count() == 0


def test_inactive_rule_is_ignored(customer, product, creator):
    appt = make_appointment(customer, product, creator)
    make_rule(
        conditions=[("appointment_type", TYPE_HATIRLATMA)],
        offsets=[(timedelta(days=1), ReminderOffset.Direction.BEFORE)],
        active=False,
    )
    services.generate_for_appointment(appt)
    assert ScheduledNotification.objects.filter(appointment=appt).count() == 0


# ── Sil-ve-yeniden-hesapla ────────────────────────────────────────────────────


def test_recompute_cancels_old_pending_and_creates_new(customer, product, creator):
    appt = make_appointment(customer, product, creator)
    make_rule(
        conditions=[("appointment_type", TYPE_HATIRLATMA)],
        offsets=[(timedelta(days=1), ReminderOffset.Direction.BEFORE)],
    )

    services.generate_for_appointment(appt)
    first = ScheduledNotification.objects.get(
        appointment=appt, status=ScheduledNotification.Status.PENDING
    )

    services.generate_for_appointment(appt)

    first.refresh_from_db()
    assert first.status == ScheduledNotification.Status.CANCELLED
    assert (
        ScheduledNotification.objects.filter(
            appointment=appt, status=ScheduledNotification.Status.PENDING
        ).count()
        == 1
    )


def test_recompute_does_not_touch_processing_or_sent(customer, product, creator):
    appt = make_appointment(customer, product, creator)
    make_rule(
        conditions=[("appointment_type", TYPE_HATIRLATMA)],
        offsets=[(timedelta(days=1), ReminderOffset.Direction.BEFORE)],
    )
    sent = ScheduledNotification.objects.create(
        appointment=appt,
        scheduled_at=timezone.now(),
        status=ScheduledNotification.Status.SENT,
    )
    processing = ScheduledNotification.objects.create(
        appointment=appt,
        scheduled_at=timezone.now(),
        status=ScheduledNotification.Status.PROCESSING,
    )

    services.generate_for_appointment(appt)

    sent.refresh_from_db()
    processing.refresh_from_db()
    assert sent.status == ScheduledNotification.Status.SENT
    assert processing.status == ScheduledNotification.Status.PROCESSING


# ── Kalan süre ifadesi ────────────────────────────────────────────────────────


def test_humanize_remaining_future_and_past():
    now = timezone.now()
    assert (
        services.humanize_remaining(now + timedelta(hours=2), now=now) == "2 saat kaldı"
    )
    assert (
        services.humanize_remaining(now + timedelta(days=1), now=now) == "1 gün kaldı"
    )
    assert (
        services.humanize_remaining(now - timedelta(hours=3), now=now) == "3 saat geçti"
    )


# ── Poller ────────────────────────────────────────────────────────────────────


def test_poller_dispatches_due_rows_only(
    customer, product, creator, assigned_user, reminder_notif_rule
):
    appt = make_appointment(customer, product, creator)
    rule = make_rule(
        conditions=[("appointment_type", TYPE_HATIRLATMA)],
        assigned=True,
        notification_rule=reminder_notif_rule,
    )
    due = ScheduledNotification.objects.create(
        appointment=appt,
        rule=rule,
        scheduled_at=timezone.now() - timedelta(minutes=1),
        status=ScheduledNotification.Status.PENDING,
    )
    future = ScheduledNotification.objects.create(
        appointment=appt,
        rule=rule,
        scheduled_at=timezone.now() + timedelta(days=1),
        status=ScheduledNotification.Status.PENDING,
    )

    dispatched = poll_due_reminders()

    due.refresh_from_db()
    future.refresh_from_db()
    assert dispatched == 1
    assert due.status == ScheduledNotification.Status.SENT
    assert due.sent_at is not None
    assert future.status == ScheduledNotification.Status.PENDING
    # Boru hattı atanmış kullanıcıya in-app bildirim üretti.
    note = Notification.objects.get(
        recipient=assigned_user, type_key=services.REMINDER_EVENT_KEY
    )
    assert "kaldı" in note.body or "geçti" in note.body


def test_past_due_offset_is_sent_immediately_with_remaining_time(
    customer, product, creator, assigned_user, reminder_notif_rule
):
    # Randevu 2 saat sonra; "1 gün önce" offseti → scheduled_at geçmişte (hemen due).
    appt = make_appointment(
        customer, product, creator, when=timezone.now() + timedelta(hours=2)
    )
    make_rule(
        conditions=[("appointment_type", TYPE_HATIRLATMA)],
        offsets=[(timedelta(days=1), ReminderOffset.Direction.BEFORE)],
        assigned=True,
        notification_rule=reminder_notif_rule,
    )

    services.generate_for_appointment(appt)
    row = ScheduledNotification.objects.get(
        appointment=appt, status=ScheduledNotification.Status.PENDING
    )
    assert row.scheduled_at < timezone.now()  # geçmişte ama atlanmıyor

    poll_due_reminders()

    row.refresh_from_db()
    assert row.status == ScheduledNotification.Status.SENT
    note = Notification.objects.get(
        recipient=assigned_user, type_key=services.REMINDER_EVENT_KEY
    )
    assert "2 saat kaldı" in note.body


# ── Sinyal entegrasyonu ───────────────────────────────────────────────────────


def test_appointment_create_signal_generates_rows(
    customer, product, creator, django_capture_on_commit_callbacks
):
    make_rule(
        conditions=[("appointment_type", TYPE_HATIRLATMA)],
        offsets=[(timedelta(days=1), ReminderOffset.Direction.BEFORE)],
    )

    with django_capture_on_commit_callbacks(execute=True):
        appt = make_appointment(customer, product, creator)

    assert (
        ScheduledNotification.objects.filter(
            appointment=appt, status=ScheduledNotification.Status.PENDING
        ).count()
        == 1
    )
