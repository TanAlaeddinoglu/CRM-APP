from django.contrib import admin

from .models import EmailLog, MailConfiguration, MailConfigurationTestSession


@admin.register(MailConfiguration)
class MailConfigurationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "backend_type",
        "host",
        "port",
        "is_active",
        "last_test_status",
        "last_test_at",
        "updated_at",
    )
    list_filter = ("backend_type", "is_active", "last_test_status")
    search_fields = ("name", "host", "default_from_email")


@admin.register(MailConfigurationTestSession)
class MailConfigurationTestSessionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "mail_configuration",
        "tested_by",
        "status",
        "recipient_email",
        "expires_at",
        "created_at",
    )
    list_filter = ("status", "created_at", "expires_at")
    search_fields = ("recipient_email", "config_fingerprint")


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "subject",
        "delivery_type",
        "status",
        "mail_configuration",
        "sent_at",
        "created_by",
        "created_at",
    )
    list_filter = ("delivery_type", "status", "created_at", "sent_at")
    search_fields = ("subject", "from_email", "to_emails")
