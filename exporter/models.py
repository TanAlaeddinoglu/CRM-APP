from django.conf import settings
from django.db import models


class ExportJob(models.Model):
    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        COMPLETED_WITH_ERRORS = "completed_with_errors", "Completed With Errors"
        FAILED = "failed", "Failed"

    class FileStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        CREATED = "created", "Created"
        CREATE_FAILED = "create_failed", "Create Failed"
        DELETED = "deleted", "Deleted"
        DELETE_FAILED = "delete_failed", "Delete Failed"

    class EmailStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"
        SKIPPED = "skipped", "Skipped"

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="export_jobs",
    )
    model_name = models.CharField(max_length=100)
    file_type = models.CharField(max_length=20)
    selected_fields = models.JSONField(default=list, blank=True)
    recipient_email = models.EmailField()
    email_subject = models.CharField(max_length=255, blank=True)
    email_body = models.TextField(blank=True)
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.QUEUED,
    )
    file_status = models.CharField(
        max_length=30,
        choices=FileStatus.choices,
        default=FileStatus.PENDING,
    )
    email_status = models.CharField(
        max_length=20,
        choices=EmailStatus.choices,
        default=EmailStatus.PENDING,
    )
    row_count = models.PositiveIntegerField(default=0)
    file_name = models.CharField(max_length=255, blank=True)
    relative_path = models.CharField(max_length=500, blank=True)
    absolute_path = models.CharField(max_length=1000, blank=True)
    workflow_task_id = models.CharField(max_length=255, blank=True)
    email_log = models.ForeignKey(
        "notifications.EmailLog",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="export_jobs",
    )
    metadata = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.model_name}:{self.file_type} -> {self.recipient_email}"
