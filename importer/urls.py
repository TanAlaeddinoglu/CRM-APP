from django.urls import path

from importer.views import ImportColumnsView, ImportPreviewView, ImportStartView

urlpatterns = [
    path("columns/", ImportColumnsView.as_view(), name="import-columns"),
    path("preview/", ImportPreviewView.as_view(), name="import-preview"),
    path("start/", ImportStartView.as_view(), name="import-start"),
]
