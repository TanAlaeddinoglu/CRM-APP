from django.urls import path

from .mail.views import MailConfigurationTestView, MailConfigurationView, SendEmailView


urlpatterns = [
    path("emails/", SendEmailView.as_view(), name="send-email"),
    path("email-settings/", MailConfigurationView.as_view(), name="mail-configuration"),
    path(
        "email-settings/test/",
        MailConfigurationTestView.as_view(),
        name="mail-configuration-test",
    ),
]
