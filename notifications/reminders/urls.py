from django.urls import path

from .views import (
    ReminderConditionFieldsView,
    ReminderRuleDetailView,
    ReminderRuleListCreateView,
)

urlpatterns = [
    path("rules/", ReminderRuleListCreateView.as_view(), name="reminder-rule-list"),
    path(
        "rules/<int:pk>/",
        ReminderRuleDetailView.as_view(),
        name="reminder-rule-detail",
    ),
    path(
        "condition-fields/",
        ReminderConditionFieldsView.as_view(),
        name="reminder-condition-fields",
    ),
]
