from events.models import Appointment
from exporter.registry.base_registry import BaseExportRegistry


class AppointmentExportRegistry(BaseExportRegistry):
    model_name = "events"
    default_fields = [
        "name",
        "scheduled_for",
        "appointment_type",
        "notes",
        "status",
        "created_at",
        "updated_at",
        "created_by",
        "customer",
        "product",
        "updated_by",
    ]
    field_map = {
        "name": "name",
        "scheduled_for": "scheduled_for",
        "appointment_type": "appointment_type",
        "notes": "notes",
        "status": "status",
        "created_at": "created_at",
        "updated_at": "updated_at",
        "customer": "customer.full_name",
        "product": "product.name",
        "created_by": "created_by.username",
        "updated_by": "updated_by.username",
    }

    def get_queryset(self, user):
        return Appointment.objects.all().order_by("-scheduled_for")
