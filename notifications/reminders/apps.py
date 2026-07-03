from django.apps import AppConfig


class RemindersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "notifications.reminders"
    label = "reminders"
    verbose_name = "Hatırlatmalar"
