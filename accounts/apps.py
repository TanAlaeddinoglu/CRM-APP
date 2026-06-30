from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "accounts"

    def ready(self):
        from django.db.models.signals import post_save, pre_save

        from .models import CustomUser
        from accounts.notifications.signals import (
            on_user_post_save,
            on_user_pre_save,
        )

        pre_save.connect(on_user_pre_save, sender=CustomUser)
        post_save.connect(on_user_post_save, sender=CustomUser)
