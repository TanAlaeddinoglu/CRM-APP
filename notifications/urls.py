from django.urls import include, path

from .mail.views import MailConfigurationTestView, MailConfigurationView, SendEmailView
from .views.notification import (
    NotificationDeleteAllView,
    NotificationDeleteView,
    NotificationListView,
    NotificationMarkAllReadView,
    NotificationMarkReadView,
    NotificationUnreadCountView,
)
from .views.rule import NotificationRuleDetailView, NotificationRuleListCreateView
from .views.type import NotificationTypeListView

urlpatterns = [
    # mail
    path("emails/", SendEmailView.as_view(), name="send-email"),
    path("email-settings/", MailConfigurationView.as_view(), name="mail-configuration"),
    path(
        "email-settings/test/",
        MailConfigurationTestView.as_view(),
        name="mail-configuration-test",
    ),
    # in-app feed
    path("", NotificationListView.as_view(), name="notification-list"),
    path(
        "unread-count/",
        NotificationUnreadCountView.as_view(),
        name="notification-unread-count",
    ),
    path(
        "<int:pk>/mark-read/",
        NotificationMarkReadView.as_view(),
        name="notification-mark-read",
    ),
    path(
        "mark-all-read/",
        NotificationMarkAllReadView.as_view(),
        name="notification-mark-all-read",
    ),
    path(
        "delete-all/",
        NotificationDeleteAllView.as_view(),
        name="notification-delete-all",
    ),
    path(
        "<int:pk>/delete/",
        NotificationDeleteView.as_view(),
        name="notification-delete",
    ),
    # rules (admin)
    path(
        "rules/",
        NotificationRuleListCreateView.as_view(),
        name="notification-rule-list",
    ),
    path(
        "rules/<int:pk>/",
        NotificationRuleDetailView.as_view(),
        name="notification-rule-detail",
    ),
    # types (read-only)
    path("types/", NotificationTypeListView.as_view(), name="notification-type-list"),
    # reminders (timer rules, admin)
    path("reminders/", include("notifications.reminders.urls")),
]
