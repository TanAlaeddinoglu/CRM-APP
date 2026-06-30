from django.apps import AppConfig


class CustomerConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "customer"

    def ready(self):
        from django.db.models.signals import post_delete, post_save, pre_save

        from .models import Customer, Tag
        from customer.notifications.signals import (
            on_customer_post_save,
            on_customer_pre_save,
            on_tag_post_delete,
            on_tag_post_save,
        )

        pre_save.connect(on_customer_pre_save, sender=Customer)
        post_save.connect(on_customer_post_save, sender=Customer)
        post_save.connect(on_tag_post_save, sender=Tag)
        post_delete.connect(on_tag_post_delete, sender=Tag)
