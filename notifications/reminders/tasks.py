import logging

from django.db import connection, transaction
from django.utils import timezone

from djangoCRM.celery import app

logger = logging.getLogger(__name__)

# Bir tur içinde işlenecek azami satır sayısı (poller hafif kalsın).
POLL_BATCH_SIZE = 500


@app.task
def poll_due_reminders():
    """Vakti gelen PENDING hatırlatmaları bulup mevcut gönderim boru hattına devreder.

    Kural/serileştirme/gönderim mantığı İÇERMEZ; yalnızca due satırları atomik
    şekilde sahiplenir (select_for_update + skip_locked) ve dispatch_reminder'a verir.
    """
    from .models import ScheduledNotification
    from .services import dispatch_reminder

    now = timezone.now()

    due_ids = list(
        ScheduledNotification.objects.filter(
            status=ScheduledNotification.Status.PENDING,
            scheduled_at__lte=now,
        )
        .order_by("scheduled_at")
        .values_list("id", flat=True)[:POLL_BATCH_SIZE]
    )
    if not due_ids:
        return 0

    # Atomik sahiplenme: due satırları kilitle, önce PROCESSING'e çevir.
    # Postgres'te select_for_update(skip_locked) çakışan beat/worker'larda çift
    # gönderimi önler; desteklemeyen backend'lerde (ör. SQLite) status filtreli
    # UPDATE atomik sahiplenmeyi sağlar.
    with transaction.atomic():
        base = ScheduledNotification.objects.filter(
            id__in=due_ids, status=ScheduledNotification.Status.PENDING
        )
        if connection.features.has_select_for_update_skip_locked:
            base = base.select_for_update(skip_locked=True)
        claimed_ids = list(base.values_list("id", flat=True))
        if claimed_ids:
            ScheduledNotification.objects.filter(
                id__in=claimed_ids, status=ScheduledNotification.Status.PENDING
            ).update(status=ScheduledNotification.Status.PROCESSING)

    if not claimed_ids:
        return 0

    dispatched = 0
    for sn in ScheduledNotification.objects.filter(id__in=claimed_ids).select_related(
        "appointment", "appointment__customer", "rule"
    ):
        try:
            dispatch_reminder(sn)
            dispatched += 1
        except Exception:
            logger.exception(
                "Reminder dispatch failed for ScheduledNotification %s", sn.pk
            )
            # Yeniden denenebilmesi için PENDING'e geri al.
            ScheduledNotification.objects.filter(
                id=sn.pk, status=ScheduledNotification.Status.PROCESSING
            ).update(status=ScheduledNotification.Status.PENDING)

    return dispatched


@app.task
def regenerate_future_reminders():
    """Gelecekteki tüm randevular için hatırlatmaları yeniden üretir (geri doldurma).

    Kural oluşturma/güncelleme/silme sonrası tetiklenir. generate_for_appointment her
    randevu için TÜM kuralları yeniden hesapladığından idempotenttir; tek görev
    create/update/delete'i tek tip kapsar.
    """
    from events.models import Appointment
    from .services import generate_for_appointment

    now = timezone.now()
    count = 0
    for appointment in (
        Appointment.objects.filter(scheduled_for__gte=now)
        .select_related("customer")
        .iterator()
    ):
        generate_for_appointment(appointment)
        count += 1
    return count
