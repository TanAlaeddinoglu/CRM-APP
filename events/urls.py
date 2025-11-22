from django.urls import path

from events.views import AppointmentViewSet, AppointmentPaymentsViewSet

urlpatterns = [
    path(
        "appointments/",
        AppointmentViewSet.as_view({"get": "list", "post": "create"}),
        name="appointments",
    ),
    path(
        "appointments/<int:pk>/",
        AppointmentViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="appointment-details",
    ),
    path(
        "appointment-payments/",
        AppointmentPaymentsViewSet.as_view({"get": "list", "post": "create"}),
        name="appointment-payments",
    ),
    path(
        "appointment-payments/<int:pk>/",
        AppointmentPaymentsViewSet.as_view(
            {
                "get": "retrieve",
                "delete": "destroy",
            }
        ),
        name="appointment-payment-details",
    ),
]
