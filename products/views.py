from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from accounts.authenticate import CustomAuthentication
from products.filters import ProductFilter
from products.models import Product, CustomerProduct
from products.serializers import ProductSerializer, CustomerProductsSerializer


class ProductsViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    authentication_classes = (CustomAuthentication,)
    permission_classes = (IsAuthenticated, IsAdminUser)
    filter_backends = (
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    )
    filterset_class = ProductFilter

    search_fields = ["name", "slug"]

    ordering_fields = ["name", "created_at", "created_by"]
    ordering = ["-created_at"]  # varsayılan


class CustomerProductsViewSet(viewsets.ModelViewSet):
    """
    A viewset that provides search, filter, order features. Users can Access own customers
    """

    serializer_class = CustomerProductsSerializer
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated]

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    # TODO: product filter ekle
    search_fields = [
        "product__name",
        "customer__customer_name",
        "customer__customer_surname",
    ]
    ordering_fields = ["created_at", "updated_at", "customer__id", "product__id"]
    ordering = ["-created_at"]

    def get_queryset(self):
        base_queryset = CustomerProduct.objects.select_related("customer", "product")
        user = getattr(self.request, "user", None)

        if not user or not user.is_authenticated:
            return base_queryset.none()

        if user.is_staff or user.is_superuser:
            return base_queryset.order_by("customer__id", "-created_at")

        return base_queryset.filter(
            customer__assigned_to=user,
        ).order_by("-created_at")
