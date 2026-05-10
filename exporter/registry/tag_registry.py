from customer.models import Tag
from exporter.registry.base_registry import BaseExportRegistry


class TagExportRegistry(BaseExportRegistry):
    model_name = "tag"
    default_fields = [
        "tag_name",
        "slug",
        "description",
    ]
    field_map = {
        "tag_name": "tag_name",
        "slug": "slug",
        "description": "description",
    }

    def get_queryset(self, user):
        return Tag.objects.all().order_by("-id")
