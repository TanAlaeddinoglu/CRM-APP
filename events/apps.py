from django.apps import AppConfig


class EventsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "events"

    def ready(self):
        from django.db.models.signals import post_save, pre_save

        from .models import Appointment
        from events.notifications.signals import (
            on_appointment_post_save,
            on_appointment_pre_save,
        )

        pre_save.connect(on_appointment_pre_save, sender=Appointment)
        post_save.connect(on_appointment_post_save, sender=Appointment)
