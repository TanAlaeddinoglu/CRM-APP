from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class ImportJob(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Bekliyor"
        PREVIEWED = "PREVIEWED", "Önizlendi"
        RUNNING = "RUNNING", "Çalışıyor"
        DONE = "DONE", "Tamamlandı"
        FAILED = "FAILED", "Başarısız"

    class SourceType(models.TextChoices):
        EXCEL = "excel", "Excel"
        CSV = "csv", "CSV"
        WEBHOOK = "webhook", "Webhook"

    model_key = models.CharField(max_length=100)
    source_type = models.CharField(max_length=20, choices=SourceType.choices)
    file = models.FileField(upload_to="imports/", null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    total_rows = models.IntegerField(default=0)
    success_count = models.IntegerField(default=0)
    error_count = models.IntegerField(default=0)
    skipped_count = models.IntegerField(default=0)
    preview_result = models.JSONField(null=True, blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="import_jobs",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"ImportJob({self.model_key}, {self.status}, {self.created_at})"


class ImportRow(models.Model):
    class Status(models.TextChoices):
        OK = "ok", "Başarılı"
        ERROR = "error", "Hatalı"
        SKIPPED = "skipped", "Atlandı"
        DUPLICATE = "duplicate", "Tekrar"

    job = models.ForeignKey(ImportJob, on_delete=models.CASCADE, related_name="rows")
    row_index = models.IntegerField()
    raw_data = models.JSONField(default=dict)
    normalized_data = models.JSONField(default=dict)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OK
    )
    errors = models.JSONField(default=list)
    object_id = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ["row_index"]

    def __str__(self):
        return f"ImportRow(job={self.job_id}, idx={self.row_index}, {self.status})"
