from customer.models import Customer
from exporter.registry.base_registry import BaseExportRegistry


class CustomerExportRegistry(BaseExportRegistry):
    model_name = "customer"
    default_fields = [
        "customer_name",
        "customer_surname",
        "customer_email",
        "customer_phone",
        "status",
        "assigned_to",
        "tag",
        "created_at",
    ]
    field_map = {
        "customer_name": "customer_name",
        "customer_surname": "customer_surname",
        "customer_email": "customer_email",
        "customer_phone": "customer_phone",
        "date_of_birth": "date_of_birth",
        "city": "city",
        "status": "status",
        "source": "source",
        "is_active": "is_active",
        "assigned_to": "assigned_to.username",
        "tag": "tag.tag_name",
        "created_at": "created_at",
        "updated_at": "updated_at",
        "created_by": "created_by.username",
        "updated_by": "updated_by.username",
        "archived_at": "archived_at",
    }

    def get_queryset(self, user):
        queryset = Customer.objects.all().order_by("-created_at")
        if user.is_staff or user.is_superuser:
            return queryset
        return queryset.filter(assigned_to=user)
