from django.apps import AppConfig


class ProductsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "products"

    def ready(self):
        from django.db.models.signals import post_delete, post_save

        from .models import Product
        from products.notifications.signals import (
            on_product_post_delete,
            on_product_post_save,
        )

        post_save.connect(on_product_post_save, sender=Product)
        post_delete.connect(on_product_post_delete, sender=Product)
