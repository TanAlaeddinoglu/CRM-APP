from django.db import transaction

from notifications.utils import active_admins, format_user_name


def _customer_name(instance):
    customer = getattr(instance, "customer", None)
    return customer.full_name() if customer is not None else ""


def _scheduled_for(instance):
    value = getattr(instance, "scheduled_for", None)
    return value.strftime("%d.%m.%Y %H:%M") if value else ""


# Hatırlatma kuralı eşleşmesini etkileyen alanlar: scheduled_for (offset çapası)
# ile tür/durum (kural koşulları). Bunlardan biri değişirse hatırlatmalar yeniden üretilir.
_REMINDER_TRACKED_FIELDS = ("scheduled_for", "appointment_type", "status")


def _schedule_reminder_generation(instance):
    from notifications.reminders.services import generate_for_appointment

    transaction.on_commit(lambda: generate_for_appointment(instance))


def on_appointment_pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            original = sender.objects.values(*_REMINDER_TRACKED_FIELDS).get(
                pk=instance.pk
            )
        except sender.DoesNotExist:
            original = None
    else:
        original = None

    instance._original_status = original["status"] if original else None
    instance._reminder_originals = original


def on_appointment_post_save(sender, instance, created, **kwargs):
    from notifications.api import notify

    if created:
        transaction.on_commit(
            lambda: notify(
                "events.appointment_created",
                payload={
                    "appointment_name": instance.name,
                    "appointment_id": instance.pk,
                    "customer_id": instance.customer_id,
                    "customer_name": _customer_name(instance),
                    "scheduled_for": _scheduled_for(instance),
                    "actor_name": format_user_name(
                        getattr(instance, "created_by", None)
                    ),
                },
                target=instance,
            )
        )
        _schedule_reminder_generation(instance)
        return

    originals = getattr(instance, "_reminder_originals", None)
    if originals is not None and any(
        originals[field] != getattr(instance, field)
        for field in _REMINDER_TRACKED_FIELDS
    ):
        _schedule_reminder_generation(instance)

    original_status = getattr(instance, "_original_status", None)
    if original_status is not None and original_status != instance.status:
        new_status = instance.status
        transaction.on_commit(
            lambda: notify(
                "events.appointment_status_updated",
                payload={
                    "appointment_name": instance.name,
                    "appointment_id": instance.pk,
                    "new_status": new_status,
                    "old_status": original_status,
                    "customer_id": instance.customer_id,
                    "customer_name": _customer_name(instance),
                    "actor_name": format_user_name(
                        getattr(instance, "updated_by", None)
                    ),
                },
                target=instance,
            )
        )


def on_appointment_post_delete(sender, instance, **kwargs):
    from notifications.api import notify

    # Randevu silindiğinde alıcı yönlendirmesi created_by'a göre yapılır
    # (oluşturma kuralıyla aynı): admin oluşturduysa → müşterinin atanmış
    # kullanıcısı; user oluşturduysa → tüm aktif adminler.
    actor = getattr(instance, "created_by", None)
    if actor is None:
        return

    if actor.is_admin():
        assigned = getattr(getattr(instance, "customer", None), "assigned_to", None)
        recipients = [assigned] if assigned is not None else []
    else:
        recipients = active_admins()

    if not recipients:
        return

    appointment_name = instance.name
    customer_id = instance.customer_id
    customer_name = _customer_name(instance)
    transaction.on_commit(
        lambda: notify(
            "events.appointment_deleted",
            payload={
                "appointment_name": appointment_name,
                "customer_id": customer_id,
                "customer_name": customer_name,
            },
            recipients=recipients,
            target=None,
        )
    )
