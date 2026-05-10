from django.urls import path

from exporter.api.views import ExportView


urlpatterns = [
    path("", ExportView.as_view(), name="export-create"),
]
