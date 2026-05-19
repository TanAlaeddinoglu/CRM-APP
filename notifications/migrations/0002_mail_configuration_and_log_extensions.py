from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.db.models import Q


class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="MailConfiguration",
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
                ("name", models.CharField(default="Default SMTP", max_length=120)),
                (
                    "backend_type",
                    models.CharField(
                        choices=[("smtp", "SMTP")],
                        default="smtp",
                        max_length=20,
                    ),
                ),
                ("host", models.CharField(max_length=255)),
                ("port", models.PositiveIntegerField()),
                ("use_tls", models.BooleanField(default=True)),
                ("use_ssl", models.BooleanField(default=False)),
                ("default_from_email", models.EmailField(max_length=254)),
                ("username_secret_name", models.CharField(max_length=255)),
                ("password_secret_name", models.CharField(max_length=255)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "last_test_status",
                    models.CharField(
                        choices=[
                            ("untested", "Untested"),
                            ("passed", "Passed"),
                            ("failed", "Failed"),
                        ],
                        default="untested",
                        max_length=20,
                    ),
                ),
                ("last_test_at", models.DateTimeField(blank=True, null=True)),
                ("last_test_recipient", models.EmailField(blank=True, max_length=254)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_mail_configurations",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="updated_mail_configurations",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-updated_at", "-created_at"],
                "constraints": [
                    models.UniqueConstraint(
                        condition=Q(is_active=True),
                        fields=("is_active",),
                        name="unique_active_mail_configuration",
                    )
                ],
            },
        ),
        migrations.CreateModel(
            name="MailConfigurationTestSession",
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
                ("config_fingerprint", models.CharField(max_length=128)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("passed", "Passed"),
                            ("failed", "Failed"),
                            ("expired", "Expired"),
                        ],
                        default="passed",
                        max_length=20,
                    ),
                ),
                ("recipient_email", models.EmailField(max_length=254)),
                ("expires_at", models.DateTimeField()),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "mail_configuration",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="test_sessions",
                        to="notifications.mailconfiguration",
                    ),
                ),
                (
                    "tested_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="mail_configuration_test_sessions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddField(
            model_name="emaillog",
            name="delivery_type",
            field=models.CharField(
                choices=[
                    ("system", "System"),
                    ("manual", "Manual"),
                    ("test", "Test"),
                ],
                default="system",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="emaillog",
            name="mail_configuration",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="email_logs",
                to="notifications.mailconfiguration",
            ),
        ),
        migrations.AddField(
            model_name="emaillog",
            name="test_session",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="email_logs",
                to="notifications.mailconfigurationtestsession",
            ),
        ),
    ]
