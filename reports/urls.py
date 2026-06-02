from django.urls import path

from reports.views import (
    AppointmentsSummaryViewSet,
    MyPerformanceViewSet,
    PaymentSummaryViewSet,
    ProductPriceDistributionSummaryViewSet,
    UserDashboardSummaryViewSet,
)

urlpatterns = [
    path(
        "user-dashboard-summary/",
        UserDashboardSummaryViewSet.as_view({"get": "list"}),
        name="user-dashboard-summary",
    ),
    path(
        "my-performance/",
        MyPerformanceViewSet.as_view({"get": "list"}),
        name="my-performance",
    ),
    path(
        "appointments-summary/",
        AppointmentsSummaryViewSet.as_view({"get": "list"}),
        name="appointments-summary",
    ),
    path(
        "payment-summary/",
        PaymentSummaryViewSet.as_view({"get": "list"}),
        name="payment-summary",
    ),
    path(
        "product-price-distribution-summary/",
        ProductPriceDistributionSummaryViewSet.as_view({"get": "list"}),
        name="product-price-distribution-summary",
    ),
]
