from django.contrib import admin

from .models import EmailLog


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = ("id", "subject", "status", "sent_at", "created_by", "created_at")
    list_filter = ("status", "created_at", "sent_at")
    search_fields = ("subject", "from_email", "to_emails")
