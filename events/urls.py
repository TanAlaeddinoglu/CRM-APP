from django.urls import path

from events.views import AppointmentViewSet

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
]
