from django.contrib import admin

from .mail.models import EmailLog, MailConfiguration, MailConfigurationTestSession
from .models import Notification, NotificationRule


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


@admin.register(NotificationRule)
class NotificationRuleAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "type_key",
        "name",
        "channels",
        "is_active",
        "is_system_default",
        "created_at",
    )
    list_filter = ("type_key", "is_active", "is_system_default")
    search_fields = ("type_key", "name")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "recipient", "type_key", "title", "is_read", "created_at")
    list_filter = ("type_key", "is_read", "created_at")
    search_fields = ("type_key", "title", "recipient__email")
