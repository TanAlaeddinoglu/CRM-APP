from django.urls import path

from products.views import CustomerProductsViewSet, ProductsViewSet

urlpatterns = [
    path(
        "", ProductsViewSet.as_view({"get": "list", "post": "create"}), name="products"
    ),
    path(
        "<int:pk>/",
        ProductsViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="products-detail",
    ),
    path(
        "customer-products/",
        CustomerProductsViewSet.as_view({"get": "list", "post": "create"}),
        name="customer-products",
    ),
    path(
        "customer-products/<int:pk>/",
        CustomerProductsViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="customer-products-detail",
    ),
]
