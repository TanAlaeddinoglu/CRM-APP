"""Hatırlatma alt sistemi servisleri.

Kural/instance katmanları ayrıktır: tüm offset matematiği instance üretiminde bir
kez yapılır ve dondurulur. Gönderim mevcut `notifications.api.notify` boru hattını
yeniden kullanır; burada gönderim mantığı kopyalanmaz.
"""

import logging
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from notifications.utils import active_admins
from .models import ReminderOffset, ScheduledNotification

logger = logging.getLogger(__name__)

REMINDER_EVENT_KEY = "reminders.appointment_reminder"  # Yedek; FK ile overrride edilir.

# API/frontend offsetleri tek birim olarak taşır (amount + unit); model tek bir
# DurationField saklar. Aşağıdaki yardımcılar iki gösterim arası dönüşüm yapar.
_UNIT_SECONDS = {
    "days": 86400,
    "hours": 3600,
    "minutes": 60,
}


def duration_from_amount_unit(amount, unit) -> timedelta:
    if unit not in _UNIT_SECONDS:
        raise ValueError(f"Geçersiz birim: {unit}")
    return timedelta(seconds=int(amount) * _UNIT_SECONDS[unit])


def amount_unit_from_duration(duration):
    """timedelta'yı en büyük tam bölünebilen birime ayırır (gün→saat→dakika).

    UI offset başına tek birim ürettiği için bu dönüşüm kayıpsızdır.
    """
    total_seconds = int(duration.total_seconds())
    for unit in ("days", "hours", "minutes"):
        unit_seconds = _UNIT_SECONDS[unit]
        if total_seconds % unit_seconds == 0 and total_seconds >= unit_seconds:
            return total_seconds // unit_seconds, unit
    # 0 veya bir dakikadan küçük: dakika cinsinden yuvarla.
    return max(total_seconds // 60, 0), "minutes"


def _appointment_model():
    from events.models import Appointment

    return Appointment


def allowed_condition_fields():
    """Beyaz listedeki alanları `[{name, label, choices}]` olarak döndürür.

    Değerler alanın kendi `.choices` / `verbose_name` tanımından okunur; bu yüzden
    yeni alan eklemek Appointment.REMINDER_CONDITION_FIELDS demetini düzenlemekle sınırlıdır.
    """
    Appointment = _appointment_model()
    fields = []
    for name in Appointment.REMINDER_CONDITION_FIELDS:
        field = Appointment._meta.get_field(name)
        fields.append(
            {
                "name": name,
                "label": str(field.verbose_name).title(),
                "choices": [
                    {"value": value, "label": str(label)}
                    for value, label in (field.choices or [])
                ],
            }
        )
    return fields


def allowed_field_names():
    return [f["name"] for f in allowed_condition_fields()]


# ---------------------------------------------------------------------------
# Koşul eşleştirme (yalnız AND)
# ---------------------------------------------------------------------------
def rule_matches(appointment, rule) -> bool:
    """Kuraldaki TÜM koşullar randevu ile eşleşiyorsa True (AND semantiği)."""
    conditions = rule.conditions.all()
    return all(
        str(getattr(appointment, c.field_name, None)) == str(c.value)
        for c in conditions
    )


# ---------------------------------------------------------------------------
# Instance üretimi: sil-ve-yeniden-hesapla
# ---------------------------------------------------------------------------
def _compute_scheduled_at(scheduled_for, offset: ReminderOffset):
    if offset.direction == ReminderOffset.Direction.AFTER:
        return scheduled_for + offset.duration
    return scheduled_for - offset.duration


def generate_for_appointment(appointment) -> None:
    """Randevu için zamanlanmış hatırlatmaları (yeniden) üretir.

    Mevcut PENDING satırları CANCELLED yapılır (processing/sent'e dokunulmaz),
    ardından eşleşen aktif kuralların her offseti için yeni PENDING satır oluşturulur.
    """
    from .models import ReminderRule

    scheduled_for = getattr(appointment, "scheduled_for", None)
    if scheduled_for is None:
        return

    with transaction.atomic():
        ScheduledNotification.objects.filter(
            appointment=appointment,
            status=ScheduledNotification.Status.PENDING,
        ).update(status=ScheduledNotification.Status.CANCELLED)

        rules = ReminderRule.objects.filter(is_active=True).prefetch_related(
            "conditions", "offsets"
        )

        new_rows = []
        for rule in rules:
            if not rule_matches(appointment, rule):
                continue
            for offset in rule.offsets.all():
                new_rows.append(
                    ScheduledNotification(
                        appointment=appointment,
                        rule=rule,
                        offset=offset,
                        scheduled_at=_compute_scheduled_at(scheduled_for, offset),
                        status=ScheduledNotification.Status.PENDING,
                    )
                )

        if new_rows:
            ScheduledNotification.objects.bulk_create(new_rows)


# ---------------------------------------------------------------------------
# Alıcı çözümleme (kural bazlı)
# ---------------------------------------------------------------------------
def resolve_rule_recipients(rule, appointment):
    """Kuralın hedef bayraklarına göre alıcıları döndürür (atanmış kullanıcı / adminler)."""
    recipients = []
    seen = set()

    def _add(user):
        if user is not None and user.pk not in seen:
            seen.add(user.pk)
            recipients.append(user)

    if rule is not None and rule.notify_assigned_user:
        assigned = getattr(getattr(appointment, "customer", None), "assigned_to", None)
        _add(assigned)

    if rule is not None and rule.notify_admins:
        for admin in active_admins():
            _add(admin)

    return recipients


# ---------------------------------------------------------------------------
# Kalan süre ifadesi (Türkçe)
# ---------------------------------------------------------------------------
def _humanize_delta(delta):
    """Bir timedelta'yı kabaca 'X gün'/'X saat'/'X dakika' ifadesine çevirir."""
    total_minutes = int(round(delta.total_seconds() / 60))
    if total_minutes >= 1440:
        days = total_minutes // 1440
        return f"{days} gün"
    if total_minutes >= 60:
        hours = total_minutes // 60
        return f"{hours} saat"
    if total_minutes >= 1:
        return f"{total_minutes} dakika"
    return "birkaç saniye"


def humanize_remaining(scheduled_for, now=None) -> str:
    """Gönderim anındaki gerçek kalan süreyi Türkçe ifade eder.

    Geçmiş offsetlerde de anlamlıdır: randevu gelecekteyse '… kaldı', geçmişteyse
    '… geçti'.
    """
    now = now or timezone.now()
    delta = scheduled_for - now
    if delta.total_seconds() >= 0:
        return f"{_humanize_delta(delta)} kaldı"
    return f"{_humanize_delta(-delta)} geçti"


# ---------------------------------------------------------------------------
# Gönderim: mevcut notify() boru hattını yeniden kullanır
# ---------------------------------------------------------------------------
def _customer_name(appointment):
    customer = getattr(appointment, "customer", None)
    return customer.full_name() if customer is not None else ""


def dispatch_reminder(scheduled_notification) -> None:
    """Tek bir zamanlanmış hatırlatmayı mevcut bildirim boru hattına devreder."""
    from notifications.api import notify

    sn = scheduled_notification
    appointment = sn.appointment
    recipients = resolve_rule_recipients(sn.rule, appointment)

    scheduled_for = getattr(appointment, "scheduled_for", None)
    notification_rule = sn.rule.notification_rule if sn.rule else None

    if notification_rule is None:
        logger.warning(
            "dispatch_reminder: rule %s has no linked notification_rule — skipping send",
            sn.rule_id,
        )
        sn.status = ScheduledNotification.Status.CANCELLED
        sn.save(update_fields=["status", "updated_at"])
        return
    elif recipients and scheduled_for is not None:
        time_phrase = humanize_remaining(scheduled_for)
        channels = sn.rule.channels if sn.rule else ["in_app"]
        notify(
            notification_rule.type_key or REMINDER_EVENT_KEY,
            payload={
                "appointment_name": appointment.name,
                "appointment_id": appointment.pk,
                "customer_name": _customer_name(appointment),
                "scheduled_for": scheduled_for.strftime("%d.%m.%Y %H:%M"),
                "time_phrase": time_phrase,
            },
            recipients=recipients,
            target=appointment,
            channels=channels,
            notification_rule_id=notification_rule.pk,
        )

    sn.status = ScheduledNotification.Status.SENT
    sn.sent_at = timezone.now()
    sn.save(update_fields=["status", "sent_at", "updated_at"])
