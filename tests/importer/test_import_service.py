import pytest

from importer.models import ImportJob
from importer.registry import registry
from importer.services import ImportService


@pytest.fixture(autouse=True)
def ensure_customer_importer_registered():
    """Ensure CustomerImporter is in registry (normally done in apps.ready)."""
    if "customer" not in registry.keys():
        from customer.importers.registry import register
        register()


@pytest.mark.django_db
def test_preview_webhook_creates_import_job(admin_user):
    rows = [
        {
            "customer_name": "Ali",
            "customer_surname": "Veli",
            "customer_phone": "905551234567",
            "customer_email": "ali@example.com",
            "city": "Istanbul",
            "source": "excel",
        }
    ]

    result = ImportService.preview(
        model_key="customer",
        source_type="webhook",
        actor=admin_user,
        rows=rows,
    )

    assert "job_id" in result
    assert result["total"] == 1
    assert result["valid_count"] == 1

    job = ImportJob.objects.get(id=result["job_id"])
    assert job.model_key == "customer"
    assert job.source_type == "webhook"
    assert job.status == ImportJob.Status.PREVIEWED
    assert job.total_rows == 1
    assert job.created_by == admin_user


@pytest.mark.django_db
def test_preview_webhook_invalid_phone(admin_user):
    rows = [
        {
            "customer_name": "Ali",
            "customer_phone": "123",  # geçersiz telefon
        }
    ]

    result = ImportService.preview(
        model_key="customer",
        source_type="webhook",
        actor=admin_user,
        rows=rows,
    )

    assert result["valid_count"] == 0
    assert result["invalid_count"] == 1
    assert result["total"] == 1


@pytest.mark.django_db
def test_start_imports_rows(admin_user):
    rows = [
        {
            "customer_name": "Deneme",
            "customer_phone": "905559876543",
            "source": "excel",
        }
    ]

    preview_result = ImportService.preview(
        model_key="customer",
        source_type="webhook",
        actor=admin_user,
        rows=rows,
    )

    job_id = preview_result["job_id"]
    ok_rows = [r for r in preview_result["rows"] if r.get("_status") == "ok"]

    start_result = ImportService.start(
        job_id=job_id,
        actor=admin_user,
        rows=ok_rows,
    )

    assert start_result["success_count"] == 1

    job = ImportJob.objects.get(id=job_id)
    assert job.status == ImportJob.Status.DONE
    assert job.success_count == 1
