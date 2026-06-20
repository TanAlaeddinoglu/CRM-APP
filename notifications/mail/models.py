from django.conf import settings
from django.db import models
from django.db.models import Q


class MailConfiguration(models.Model):
    class BackendType(models.TextChoices):
        SMTP = "smtp", "SMTP"

    class TestStatus(models.TextChoices):
        UNTESTED = "untested", "Untested"
        PASSED = "passed", "Passed"
        FAILED = "failed", "Failed"

    name = models.CharField(max_length=120, default="Default SMTP")
    backend_type = models.CharField(
        max_length=20,
        choices=BackendType.choices,
        default=BackendType.SMTP,
    )
    host = models.CharField(max_length=255)
    port = models.PositiveIntegerField()
    use_tls = models.BooleanField(default=True)
    use_ssl = models.BooleanField(default=False)
    default_from_email = models.EmailField()
    username_secret_name = models.CharField(max_length=255)
    password_secret_name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    last_test_status = models.CharField(
        max_length=20,
        choices=TestStatus.choices,
        default=TestStatus.UNTESTED,
    )
    last_test_at = models.DateTimeField(null=True, blank=True)
    last_test_recipient = models.EmailField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_mail_configurations",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_mail_configurations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "notifications"
        ordering = ["-updated_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["is_active"],
                condition=Q(is_active=True),
                name="unique_active_mail_configuration",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.host}:{self.port})"


class MailConfigurationTestSession(models.Model):
    class Status(models.TextChoices):
        PASSED = "passed", "Passed"
        FAILED = "failed", "Failed"
        EXPIRED = "expired", "Expired"

    mail_configuration = models.ForeignKey(
        MailConfiguration,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="test_sessions",
    )
    tested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mail_configuration_test_sessions",
    )
    config_fingerprint = models.CharField(max_length=128)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PASSED,
    )
    recipient_email = models.EmailField()
    expires_at = models.DateTimeField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "notifications"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Mail test session {self.pk} ({self.status})"


class EmailLog(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"

    class DeliveryType(models.TextChoices):
        SYSTEM = "system", "System"
        MANUAL = "manual", "Manual"
        TEST = "test", "Test"

    subject = models.CharField(max_length=255)
    body = models.TextField()
    from_email = models.EmailField(blank=True)
    to_emails = models.JSONField(default=list)
    cc_emails = models.JSONField(default=list, blank=True)
    bcc_emails = models.JSONField(default=list, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    delivery_type = models.CharField(
        max_length=20,
        choices=DeliveryType.choices,
        default=DeliveryType.SYSTEM,
    )
    metadata = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    mail_configuration = models.ForeignKey(
        MailConfiguration,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="email_logs",
    )
    test_session = models.ForeignKey(
        MailConfigurationTestSession,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="email_logs",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="email_logs",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "notifications"
        ordering = ["-created_at"]

    def __str__(self):
        primary_recipient = self.to_emails[0] if self.to_emails else "no-recipient"
        return f"{self.subject} -> {primary_recipient}"
