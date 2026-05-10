from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("notifications", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ExportJob",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("model_name", models.CharField(max_length=100)),
                ("file_type", models.CharField(max_length=20)),
                ("selected_fields", models.JSONField(blank=True, default=list)),
                ("recipient_email", models.EmailField(max_length=254)),
                ("email_subject", models.CharField(blank=True, max_length=255)),
                ("email_body", models.TextField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("queued", "Queued"),
                            ("processing", "Processing"),
                            ("completed", "Completed"),
                            ("completed_with_errors", "Completed With Errors"),
                            ("failed", "Failed"),
                        ],
                        default="queued",
                        max_length=30,
                    ),
                ),
                (
                    "file_status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("created", "Created"),
                            ("create_failed", "Create Failed"),
                            ("deleted", "Deleted"),
                            ("delete_failed", "Delete Failed"),
                        ],
                        default="pending",
                        max_length=30,
                    ),
                ),
                (
                    "email_status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("sent", "Sent"),
                            ("failed", "Failed"),
                            ("skipped", "Skipped"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("row_count", models.PositiveIntegerField(default=0)),
                ("file_name", models.CharField(blank=True, max_length=255)),
                ("relative_path", models.CharField(blank=True, max_length=500)),
                ("absolute_path", models.CharField(blank=True, max_length=1000)),
                ("workflow_task_id", models.CharField(blank=True, max_length=255)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("error_message", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="export_jobs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "email_log",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="export_jobs",
                        to="notifications.emaillog",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
