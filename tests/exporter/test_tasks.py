import pytest
from django.db import OperationalError

from exporter.models import ExportJob
from exporter.services.export_service import ExportResult
from exporter.tasks import (
    create_export_file_task,
    delete_export_file_task,
    queue_export_delivery,
    send_export_email_task,
)
from notifications.exceptions import EmailDeliveryError
from notifications.models import EmailLog

pytestmark = pytest.mark.django_db


def _make_job(admin_user, **overrides):
    payload = {
        "created_by": admin_user,
        "model_name": "customer",
        "file_type": "csv",
        "selected_fields": ["customer_name"],
        "recipient_email": "admin@example.com",
        "metadata": {},
    }
    payload.update(overrides)
    return ExportJob.objects.create(**payload)


def test_queue_export_delivery_builds_and_dispatches_chain(monkeypatch):
    captured = {}

    class _FakeWorkflow:
        def apply_async(self):
            return "queued"

    def _fake_chain(*steps):
        captured["steps"] = steps
        return _FakeWorkflow()

    monkeypatch.setattr("exporter.tasks.chain", _fake_chain)

    result = queue_export_delivery(job_id=17)

    assert result == "queued"
    assert len(captured["steps"]) == 3


def test_create_export_file_task_marks_job_and_returns_payload(
    admin_user,
    tmp_path,
    monkeypatch,
):
    job = _make_job(admin_user)
    export_path = tmp_path / "exports" / "customer" / "customers.csv"
    export_path.parent.mkdir(parents=True)
    export_path.write_text("customer_name\nAlpha\n")

    export_result = ExportResult(
        model_name="customer",
        file_type="csv",
        fields=["customer_name"],
        row_count=1,
        file_name="customers.csv",
        relative_path="exports/customer/customers.csv",
        absolute_path=export_path,
    )

    monkeypatch.setattr(
        "exporter.tasks.ExportService.create_export",
        lambda self, **kwargs: export_result,
    )

    payload = create_export_file_task.run(job_id=job.id)
    job.refresh_from_db()

    assert payload["job_id"] == job.id
    assert payload["file_created"] is True
    assert job.status == ExportJob.Status.PROCESSING
    assert job.file_status == ExportJob.FileStatus.CREATED
    assert job.absolute_path == str(export_path)


def test_create_export_file_task_retries_on_operational_error(
    admin_user,
    monkeypatch,
):
    job = _make_job(admin_user)

    def _raise_create(self, **kwargs):
        raise OperationalError("db down")

    class RetryCalled(Exception):
        pass

    monkeypatch.setattr("exporter.tasks.ExportService.create_export", _raise_create)
    monkeypatch.setattr(
        "exporter.tasks._retry_or_continue",
        lambda task, *, job, stage, exc: (_ for _ in ()).throw(
            RetryCalled((stage, str(exc)))
        ),
    )

    with pytest.raises(RetryCalled) as exc_info:
        create_export_file_task.run(job_id=job.id)

    job.refresh_from_db()

    assert exc_info.value.args[0] == ("file_create", "db down")
    assert job.status == ExportJob.Status.PROCESSING


def test_send_export_email_task_marks_sent_and_returns_payload(
    admin_user,
    tmp_path,
    monkeypatch,
):
    file_path = tmp_path / "export.csv"
    file_path.write_text("customer_name\nAlpha\n")
    job = _make_job(admin_user, absolute_path=str(file_path))
    payload = {"job_id": job.id, "file_created": True, "email_sent": False}
    email_log = EmailLog.objects.create(
        subject="subject",
        body="body",
        from_email="noreply@example.com",
        to_emails=["admin@example.com"],
        status=EmailLog.Status.SENT,
        created_by=admin_user,
    )

    monkeypatch.setattr(
        "exporter.tasks.send_email_notification",
        lambda **kwargs: email_log,
    )

    result = send_export_email_task.run(payload)
    job.refresh_from_db()

    assert result["email_sent"] is True
    assert job.email_status == ExportJob.EmailStatus.SENT
    assert job.email_log_id == email_log.id
    assert job.metadata["email"]["status"] == EmailLog.Status.SENT


def test_send_export_email_task_skips_when_export_file_not_available(admin_user):
    job = _make_job(admin_user, absolute_path="")
    payload = {"job_id": job.id, "file_created": False, "email_sent": False}

    result = send_export_email_task.run(payload)
    job.refresh_from_db()

    assert result["email_sent"] is False
    assert job.email_status == ExportJob.EmailStatus.SKIPPED


def test_send_export_email_task_marks_failure_and_cleans_file(
    admin_user,
    tmp_path,
    monkeypatch,
):
    file_path = tmp_path / "export.csv"
    file_path.write_text("customer_name\nAlpha\n")
    job = _make_job(admin_user, absolute_path=str(file_path))
    payload = {"job_id": job.id, "file_created": True, "email_sent": False}
    failed_log = EmailLog.objects.create(
        subject="subject",
        body="body",
        from_email="noreply@example.com",
        to_emails=["admin@example.com"],
        status=EmailLog.Status.FAILED,
        created_by=admin_user,
    )

    monkeypatch.setattr(
        "exporter.tasks.send_email_notification",
        lambda **kwargs: (_ for _ in ()).throw(EmailDeliveryError(failed_log)),
    )
    monkeypatch.setattr(
        "exporter.task_helpers.ExportService.delete_export",
        lambda self, **kwargs: True,
    )
    monkeypatch.setattr(
        "exporter.tasks._retry_or_continue",
        lambda task, *, job, stage, exc: False,
    )

    with pytest.raises(EmailDeliveryError):
        send_export_email_task.run(payload)

    job.refresh_from_db()

    assert job.status == ExportJob.Status.FAILED
    assert job.email_status == ExportJob.EmailStatus.FAILED
    assert job.file_status == ExportJob.FileStatus.DELETED
    assert job.absolute_path == ""
    assert job.metadata["cleanup"]["trigger"] == "failure_cleanup"


def test_delete_export_file_task_deletes_file_and_finalizes_job(
    admin_user,
    tmp_path,
    monkeypatch,
):
    file_path = tmp_path / "export.csv"
    file_path.write_text("customer_name\nAlpha\n")
    job = _make_job(
        admin_user,
        absolute_path=str(file_path),
        email_status=ExportJob.EmailStatus.SENT,
    )
    payload = {"job_id": job.id, "file_created": True, "email_sent": True}

    monkeypatch.setattr(
        "exporter.tasks.ExportService.delete_export",
        lambda self, **kwargs: True,
    )

    result = delete_export_file_task.run(payload)
    job.refresh_from_db()

    assert result["file_deleted"] is True
    assert job.file_status == ExportJob.FileStatus.DELETED
    assert job.status == ExportJob.Status.COMPLETED
    assert job.absolute_path == ""


def test_delete_export_file_task_finalizes_without_file(admin_user):
    job = _make_job(admin_user, absolute_path="")
    payload = {"job_id": job.id, "file_created": True, "email_sent": False}

    result = delete_export_file_task.run(payload)
    job.refresh_from_db()

    assert result["file_deleted"] is True
    assert job.status == ExportJob.Status.COMPLETED_WITH_ERRORS


def test_delete_export_file_task_marks_failure_when_delete_crashes(
    admin_user,
    tmp_path,
    monkeypatch,
):
    file_path = tmp_path / "export.csv"
    file_path.write_text("customer_name\nAlpha\n")
    job = _make_job(admin_user, absolute_path=str(file_path))
    payload = {"job_id": job.id, "file_created": True, "email_sent": True}

    monkeypatch.setattr(
        "exporter.tasks.ExportService.delete_export",
        lambda self, **kwargs: (_ for _ in ()).throw(RuntimeError("unlink failed")),
    )

    result = delete_export_file_task.run(payload)
    job.refresh_from_db()

    assert result["file_deleted"] is False
    assert job.file_status == ExportJob.FileStatus.DELETE_FAILED
    assert job.status == ExportJob.Status.FAILED
    assert job.metadata["file_delete_error"]["message"] == "unlink failed"
