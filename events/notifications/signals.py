from django.db import transaction


def on_appointment_pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._original_status = sender.objects.values_list(
                "status", flat=True
            ).get(pk=instance.pk)
        except sender.DoesNotExist:
            instance._original_status = None
    else:
        instance._original_status = None


def on_appointment_post_save(sender, instance, created, **kwargs):
    from notifications.api import notify

    if created:
        transaction.on_commit(
            lambda: notify(
                "events.appointment_created",
                payload={
                    "appointment_name": instance.name,
                    "appointment_id": instance.pk,
                },
                target=instance,
            )
        )
        return

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
                },
                target=instance,
            )
        )
