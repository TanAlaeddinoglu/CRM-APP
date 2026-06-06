from accounts.models import CustomUser
from exporter.registry.base_registry import BaseExportRegistry


class UserExportRegistry(BaseExportRegistry):
    model_name = "user"
    default_fields = [
        "last_login",
        "username",
        "first_name",
        "last_name",
        "email",
        "is_active",
        "date_joined",
        "role",
    ]
    field_map = {
        "last_login": "last_login",
        "username": "username",
        "first_name": "first_name",
        "last_name": "last_name",
        "email": "email",
        "is_active": "is_active",
        "date_joined": "date_joined",
        "role": "role",
    }

    def get_queryset(self, user):
        return CustomUser.objects.all().order_by("username")
