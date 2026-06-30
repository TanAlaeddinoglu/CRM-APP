from django.db import transaction

from notifications.utils import active_admins, format_user_name

_COMPLETED_STATUSES = {"completed", "completed_with_errors"}
_FAILED_STATUSES = {"failed"}


def on_exportjob_pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._orig_status = sender.objects.values_list("status", flat=True).get(
                pk=instance.pk
            )
        except sender.DoesNotExist:
            instance._orig_status = None
    else:
        instance._orig_status = None


def on_exportjob_post_save(sender, instance, created, **kwargs):
    from notifications.api import notify

    orig = getattr(instance, "_orig_status", None)
    if instance.status == orig:
        return

    if instance.status in _COMPLETED_STATUSES:
        key = "exporter.export_completed"
    elif instance.status in _FAILED_STATUSES:
        key = "exporter.export_failed"
    else:
        return

    # Alıcılar: export'u başlatan + tüm aktif adminler (tekilleştir).
    recipients = {u.pk: u for u in active_admins()}
    creator = getattr(instance, "created_by", None)
    if creator is not None:
        recipients[creator.pk] = creator
    recipients = list(recipients.values())
    if not recipients:
        return

    created_by_name = format_user_name(creator)

    payload = {
        "model_name": instance.model_name,
        "file_type": instance.file_type,
        "row_count": instance.row_count,
        "created_by_name": created_by_name,
        "error_message": instance.error_message or "",
    }
    transaction.on_commit(
        lambda: notify(
            key,
            payload=payload,
            recipients=recipients,
            target=instance,
        )
    )
