
import django_filters as df
from django.db.models import Q
from .models import Product


class ProductFilter(df.FilterSet):
    """
    Product Modeli icin name ve slug fieldlarini filtreler
    Ornek:
        /products/?name=productName&slug=slugName
    """
    name = df.CharFilter(field_name="name", lookup_expr="icontains")
    slug = df.CharFilter(field_name="slug", lookup_expr="icontains")

    class Meta:
        model = Product
        fields = ["name", "slug"]
