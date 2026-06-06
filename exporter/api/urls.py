from django.urls import path

from exporter.api.views import ExportHistoryMetaView, ExportView


urlpatterns = [
    path("meta/", ExportHistoryMetaView.as_view(), name="export-history-meta"),
    path("", ExportView.as_view(), name="export-create"),
]
