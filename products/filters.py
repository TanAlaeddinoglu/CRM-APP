import django_filters as df
from .models import Product, CustomerProduct


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


class CustomerProductFilter(df.FilterSet):
    """
    Product Modeli icin name ve slug fieldlarini filtreler
    Ornek:
        /products/?name=productName&slug=slugName
    """

    productId = df.NumberFilter(field_name="product_id", lookup_expr="exact")
    productName = df.CharFilter(field_name="product__name", lookup_expr="icontains")
    customer = df.CharFilter(field_name="customer__id", lookup_expr="exact")
    customerName = df.CharFilter(
        field_name="customer__customer_name", lookup_expr="icontains"
    )
    customerSurname = df.CharFilter(
        field_name="customer__customer_surname", lookup_expr="icontains"
    )

    class Meta:
        model = CustomerProduct
        fields = ["productId", "productName"]
