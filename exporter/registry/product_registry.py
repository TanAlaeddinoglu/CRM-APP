from exporter.registry.base_registry import BaseExportRegistry
from products.models import Product


class ProductExportRegistry(BaseExportRegistry):
    model_name = "product"
    default_fields = [
        "name",
        "description",
        "created_by",
        "created_at",
        "slug",
    ]
    field_map = {
        "name": "name",
        "description": "description",
        "created_by": "created_by.username",
        "slug": "slug",
        "created_at": "created_at",
    }

    def get_queryset(self, user):
        return Product.objects.all().order_by("name")
