import pytest
from django.test import override_settings
from rest_framework import status

from customer.models import Customer
from exporter.models import ExportJob
from notifications.models import EmailLog

pytestmark = pytest.mark.django_db


def test_export_view_returns_created_file_metadata(
    admin_client,
    admin_user,
    tmp_path,
    monkeypatch,
):
    Customer.objects.create(
        customer_name="Exported",
        customer_surname="User",
        customer_phone="1000000103",
        assigned_to=admin_user,
        created_by=admin_user,
    )

    queued = {}

    class _FakeAsyncResult:
        id = "chain-task-id"

    def _fake_queue_export_delivery(**kwargs):
        queued.update(kwargs)
        return _FakeAsyncResult()

    monkeypatch.setattr(
        "exporter.api.views.queue_export_delivery",
        _fake_queue_export_delivery,
    )

    with override_settings(MEDIA_ROOT=tmp_path, EXPORT_FILES_ROOT=tmp_path / "exports"):
        response = admin_client.post(
            "/api/exports/",
            {"model": "customer", "file_type": "csv"},
            format="json",
        )

    assert response.status_code == 202
    assert response.data["model"] == "customer"
    assert response.data["file_type"] == "csv"
    assert response.data["task_id"] == "chain-task-id"
    assert response.data["job_id"] > 0
    assert response.data["recipient_email"] == admin_user.email
    assert queued["job_id"] == response.data["job_id"]

    job = ExportJob.objects.get(pk=response.data["job_id"])
    assert job.created_by_id == admin_user.id
    assert job.recipient_email == admin_user.email


def test_export_view_rejects_unknown_fields(admin_client):
    response = admin_client.post(
        "/api/exports/",
        {
            "model": "customer",
            "file_type": "csv",
            "fields": ["unknown_field"],
        },
        format="json",
    )

    assert response.status_code == 400
    assert "fields" in response.data


def test_export_view_requires_recipient_email_when_user_email_missing(
    admin_client,
    admin_user,
):
    admin_user.email = ""
    admin_user.save(update_fields=["email"])

    response = admin_client.post(
        "/api/exports/",
        {"model": "customer", "file_type": "csv"},
        format="json",
    )

    assert response.status_code == 400
    assert "recipient_email" in response.data


def test_export_history_view_returns_export_jobs_with_email_logs(
    admin_client, admin_user
):
    email_log = EmailLog.objects.create(
        subject="Customer export ready",
        body="Attached export file.",
        from_email="noreply@example.com",
        to_emails=["admin@example.com"],
        status=EmailLog.Status.SENT,
        created_by=admin_user,
    )
    job = ExportJob.objects.create(
        created_by=admin_user,
        model_name="customer",
        file_type="csv",
        selected_fields=["customer_name"],
        recipient_email="admin@example.com",
        status=ExportJob.Status.COMPLETED,
        file_status=ExportJob.FileStatus.CREATED,
        email_status=ExportJob.EmailStatus.SENT,
        email_log=email_log,
        row_count=5,
    )

    response = admin_client.get("/api/exports/")

    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 1
    assert response.data[0]["id"] == job.id
    assert response.data[0]["created_by"] == admin_user.username
    assert response.data[0]["recipient_email"] == "admin@example.com"
    assert "metadata" not in response.data[0]
    assert "error_message" not in response.data[0]
    assert "email_log" not in response.data[0]


def test_export_history_view_filters_by_model_and_date(admin_client, admin_user):
    old_email_log = EmailLog.objects.create(
        subject="Old export",
        body="Old body",
        from_email="noreply@example.com",
        to_emails=["admin@example.com"],
        created_by=admin_user,
    )
    new_email_log = EmailLog.objects.create(
        subject="New export",
        body="New body",
        from_email="noreply@example.com",
        to_emails=["admin@example.com"],
        created_by=admin_user,
    )

    old_job = ExportJob.objects.create(
        created_by=admin_user,
        model_name="customer",
        file_type="csv",
        selected_fields=["customer_name"],
        recipient_email="admin@example.com",
        email_log=old_email_log,
    )
    new_job = ExportJob.objects.create(
        created_by=admin_user,
        model_name="events",
        file_type="excel",
        selected_fields=["name"],
        recipient_email="admin@example.com",
        email_log=new_email_log,
    )

    ExportJob.objects.filter(pk=old_job.pk).update(created_at="2026-05-10T08:00:00Z")
    ExportJob.objects.filter(pk=new_job.pk).update(created_at="2026-05-15T08:00:00Z")

    response = admin_client.get(
        "/api/exports/",
        {"model": "events", "date_from": "2026-05-14", "date_to": "2026-05-15"},
    )

    assert response.status_code == status.HTTP_200_OK
    assert [item["id"] for item in response.data] == [new_job.id]


def test_export_history_view_rejects_invalid_date_range(admin_client):
    response = admin_client.get(
        "/api/exports/",
        {"date_from": "2026-05-15", "date_to": "2026-05-10"},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "date_to" in response.data


def test_export_history_view_requires_admin_user(regular_client):
    response = regular_client.get("/api/exports/")

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_export_history_meta_view_returns_count_and_latest_timestamp(
    admin_client,
    admin_user,
):
    ExportJob.objects.create(
        created_by=admin_user,
        model_name="customer",
        file_type="csv",
        selected_fields=["customer_name"],
        recipient_email="admin@example.com",
    )

    response = admin_client.get("/api/exports/meta/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["latest_updated_at"] is not None
