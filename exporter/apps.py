from django.apps import AppConfig


class ExporterConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "exporter"

    def ready(self):
        from django.db.models.signals import post_save, pre_save

        from .registry.appointment_payment_registry import (
            AppointmentPaymentExportRegistry,
        )
        from .registry.appointment_registry import AppointmentExportRegistry
        from .registry.customer_registry import CustomerExportRegistry
        from .registry.product_registry import ProductExportRegistry
        from .registry.tag_registry import TagExportRegistry
        from .registry.user_registry import UserExportRegistry

        AppointmentPaymentExportRegistry.register()
        AppointmentExportRegistry.register()
        CustomerExportRegistry.register()
        ProductExportRegistry.register()
        TagExportRegistry.register()
        UserExportRegistry.register()

        from .models import ExportJob
        from exporter.notifications.signals import (
            on_exportjob_post_save,
            on_exportjob_pre_save,
        )

        pre_save.connect(on_exportjob_pre_save, sender=ExportJob)
        post_save.connect(on_exportjob_post_save, sender=ExportJob)
