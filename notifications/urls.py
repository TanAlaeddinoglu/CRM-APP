from django.urls import path

from .views import SendEmailView


urlpatterns = [
    path("emails/", SendEmailView.as_view(), name="send-email"),
]
