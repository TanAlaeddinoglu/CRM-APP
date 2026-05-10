from django.apps import AppConfig


class ExporterConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "exporter"

    def ready(self):
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
