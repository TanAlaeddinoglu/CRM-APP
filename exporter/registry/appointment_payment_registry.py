from events.models import AppointmentPayment
from exporter.registry.base_registry import BaseExportRegistry


class AppointmentPaymentExportRegistry(BaseExportRegistry):
    model_name = "payments"
    default_fields = [
        "total_amount",
        "payment_date",
        "paid_amount",
        "remaining_amount",
        "payment_status",
        "created_at",
        "updated_at",
        "appointment",
        "created_by",
        "updated_by",
    ]
    field_map = {
        "total_amount": "total_amount",
        "payment_date": "payment_date",
        "paid_amount": "paid_amount",
        "remaining_amount": "remaining_amount",
        "payment_status": "payment_status",
        "created_at": "created_at",
        "updated_at": "updated_at",
        "appointment": "appointment.name",
        "created_by": "created_by.username",
        "updated_by": "updated_by.username",
    }

    def get_queryset(self, user):
        return AppointmentPayment.objects.all().order_by("-appointment_id")
