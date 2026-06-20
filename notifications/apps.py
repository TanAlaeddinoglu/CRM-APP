from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "notifications"

    def ready(self):
        from django.utils.module_loading import autodiscover_modules

        autodiscover_modules("notification_types")
        autodiscover_modules("notifications.notification_types")

        from notifications.registry import registry
        from notifications.services.rules import NotificationRuleService

        for type_def in registry.all():
            try:
                NotificationRuleService.ensure_default_rule(type_def.key)
            except Exception:
                pass
