from django.db import transaction

from notifications.utils import active_admins, format_user_name


# ─── Customer ────────────────────────────────────────────────────────────


def on_customer_pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._orig_assigned_to_id = sender.objects.values_list(
                "assigned_to_id", flat=True
            ).get(pk=instance.pk)
        except sender.DoesNotExist:
            instance._orig_assigned_to_id = None
    else:
        instance._orig_assigned_to_id = None


def on_customer_post_save(sender, instance, created, **kwargs):
    from notifications.api import notify

    if created:
        # Müşteri oluşturuldu → yalnızca normal kullanıcı oluşturduysa adminlere
        actor = getattr(instance, "created_by", None)
        if actor is None or actor.is_admin():
            return
        recipients = active_admins(exclude=actor)
        if not recipients:
            return
        payload = {
            "customer_name": instance.full_name(),
            "created_by_name": format_user_name(actor),
            "customer_phone": instance.customer_phone or "",
            "customer_city": instance.city or "",
        }
        transaction.on_commit(
            lambda: notify(
                "customer.customer_created",
                payload=payload,
                recipients=recipients,
                target=instance,
            )
        )
        return

    # Müşteri atandı → assigned_to değişti, yeni dolu ve admin atadıysa
    orig_assigned = getattr(instance, "_orig_assigned_to_id", None)
    new_assigned = instance.assigned_to
    if new_assigned is None or new_assigned.pk == orig_assigned:
        return

    actor = getattr(instance, "updated_by", None)
    if actor is None or not actor.is_admin():
        return
    if new_assigned.pk == actor.pk:
        return

    payload = {
        "customer_name": instance.full_name(),
        "assigned_to_name": format_user_name(new_assigned),
        "assigned_by_name": format_user_name(actor),
    }
    transaction.on_commit(
        lambda: notify(
            "customer.customer_assigned",
            payload=payload,
            recipients=[new_assigned],
            target=instance,
        )
    )


# ─── Tag ─────────────────────────────────────────────────────────────────


def on_tag_post_save(sender, instance, created, **kwargs):
    from notifications.api import notify

    recipients = active_admins()
    if not recipients:
        return

    key = "tags.tag_created" if created else "tags.tag_updated"
    tag_name = instance.tag_name
    transaction.on_commit(
        lambda: notify(
            key,
            payload={"tag_name": tag_name},
            recipients=recipients,
            target=instance,
        )
    )


def on_tag_post_delete(sender, instance, **kwargs):
    from notifications.api import notify

    recipients = active_admins()
    if not recipients:
        return

    tag_name = instance.tag_name
    transaction.on_commit(
        lambda: notify(
            "tags.tag_deleted",
            payload={"tag_name": tag_name},
            recipients=recipients,
            target=None,
        )
    )
