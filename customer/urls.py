from django.urls import path
from .views import (
    AdminCustomerViewSet,
    UserCustomerViewSet,
    TagViewSet,
    CustomerTagHistoryViewSet,
    NotesViewSet,
)

urlpatterns = [
    path(
        "",
        AdminCustomerViewSet.as_view({"get": "list", "post": "create"}),
        name="customer-list-create",
    ),
    path(
        "<int:pk>/",
        AdminCustomerViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="customer-detail-update-destroy",
    ),
    path(
        "me/",
        UserCustomerViewSet.as_view(
            {
                "get": "list",
                "post": "create",
            }
        ),
        name="customer-assigned-to-user",
    ),
    path(
        "me/<int:pk>/",
        UserCustomerViewSet.as_view(
            {
                "get": "retrieve",
                "patch": "partial_update",
            }
        ),
        name="customer-detail-update-to-assigned-user",
    ),
    path(
        "tag/",
        TagViewSet.as_view({"get": "list", "post": "create"}),
        name="tag-list-create",
    ),
    path(
        "tag/<int:pk>/",
        TagViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="tag-detail-update-destroy",
    ),
    path(
        "tag-history/",
        CustomerTagHistoryViewSet.as_view({"get": "list", "post": "create"}),
        name="tag-history-list-create",
    ),
    path(
        "tag-history/<int:pk>/",
        CustomerTagHistoryViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="tag-history-detail-update-destroy",
    ),
    # path(
    #     "tag-history/by-customer/",
    #     CustomerTagHistoryViewSet.as_view({"get": "customers_tag_history"}),
    #     name="tag-history-by-customer",
    # ),
    path(
        "notes/",
        NotesViewSet.as_view({"get": "list", "post": "create"}),
        name="notes-list-create",
    ),
    path(
        "notes/<int:pk>/",
        NotesViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="notes-detail-update-destroy",
    ),
    # path(
    #     "notes/by-customer/",
    #     NotesViewSet.as_view({"get": "customers_note_history"}),
    #     name="note-history-by-customer",
    # ),
]
