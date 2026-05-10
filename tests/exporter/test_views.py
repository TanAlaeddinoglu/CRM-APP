import pytest
from django.test import override_settings

from customer.models import Customer
from exporter.models import ExportJob

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
