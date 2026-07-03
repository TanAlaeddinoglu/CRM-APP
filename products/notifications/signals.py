from django.db import transaction

from notifications.utils import active_admins


def on_product_post_save(sender, instance, created, **kwargs):
    from notifications.api import notify

    recipients = active_admins()
    if not recipients:
        return

    key = "products.product_created" if created else "products.product_updated"
    product_name = instance.name
    transaction.on_commit(
        lambda: notify(
            key,
            payload={"product_name": product_name},
            recipients=recipients,
            target=instance,
        )
    )


def on_product_post_delete(sender, instance, **kwargs):
    from notifications.api import notify

    recipients = active_admins()
    if not recipients:
        return

    product_name = instance.name
    transaction.on_commit(
        lambda: notify(
            "products.product_deleted",
            payload={"product_name": product_name},
            recipients=recipients,
            target=None,
        )
    )
