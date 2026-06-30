from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models

from notifications.mail.models import (
    EmailLog,
    MailConfiguration,
    MailConfigurationTestSession,
)

__all__ = [
    "EmailLog",
    "MailConfiguration",
    "MailConfigurationTestSession",
    "Notification",
    "NotificationRule",
]


class NotificationRule(models.Model):
    type_key = models.CharField(max_length=120)
    name = models.CharField(max_length=120)
    channels = models.JSONField(default=list)
    title_template = models.CharField(max_length=255, null=True, blank=True)
    body_template = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_system_default = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_notification_rules",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["type_key", "-is_system_default", "name"]
        constraints = [
            # Her bildirim tipi için yalnızca bir sistem varsayılan kuralı olabilir.
            # get_or_create'in eşzamanlı iki süreç tarafından çağrılması durumunda
            # ikinci INSERT IntegrityError fırlatır; Django bunu GET ile yakalar.
            models.UniqueConstraint(
                fields=["type_key"],
                condition=models.Q(is_system_default=True),
                name="notifications_notificationrule_unique_system_default",
            )
        ]

    def __str__(self):
        return f"{self.type_key} — {self.name}"


class Notification(models.Model):
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    type_key = models.CharField(max_length=120, db_index=True)
    rule = models.ForeignKey(
        NotificationRule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    title = models.CharField(max_length=255)
    body = models.TextField()
    context_payload = models.JSONField(default=dict)
    target_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    target_object_id = models.PositiveIntegerField(null=True, blank=True)
    target = GenericForeignKey("target_content_type", "target_object_id")
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read"]),
            models.Index(fields=["recipient", "created_at"]),
        ]

    def __str__(self):
        return f"{self.type_key} → {self.recipient}"
