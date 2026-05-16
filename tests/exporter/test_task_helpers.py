from pathlib import Path

import pytest

from exporter.models import ExportJob
from exporter.services.export_service import ExportResult
from exporter.task_helpers import ExportTaskHelper
from notifications.models import EmailLog

pytestmark = pytest.mark.django_db


def _make_job(admin_user):
    return ExportJob.objects.create(
        created_by=admin_user,
        model_name="customer",
        file_type="csv",
        selected_fields=["customer_name"],
        recipient_email="admin@example.com",
        metadata={},
    )


def test_export_task_helper_mark_file_created_updates_job(admin_user, tmp_path):
    job = _make_job(admin_user)
    export_path = tmp_path / "exports" / "customer" / "file.csv"
    export_path.parent.mkdir(parents=True)
    export_path.write_text("customer_name\nAlpha\n")

    export_result = ExportResult(
        model_name="customer",
        file_type="csv",
        fields=["customer_name"],
        row_count=1,
        file_name="file.csv",
        relative_path="exports/customer/file.csv",
        absolute_path=export_path,
    )

    ExportTaskHelper.mark_file_created(job, export_result)
    job.refresh_from_db()

    assert job.file_status == ExportJob.FileStatus.CREATED
    assert job.row_count == 1
    assert job.file_name == "file.csv"
    assert job.relative_path == "exports/customer/file.csv"
    assert job.absolute_path == str(export_path)
    assert job.metadata["file"]["fields"] == ["customer_name"]


def test_export_task_helper_build_attachment_reads_file(tmp_path):
    file_path = tmp_path / "report.csv"
    file_path.write_text("a,b\n1,2\n")

    attachment = ExportTaskHelper.build_attachment(str(file_path))

    assert attachment.name == "report.csv"
    assert attachment.content_type == "text/csv"
    assert attachment.read() == b"a,b\n1,2\n"


def test_export_task_helper_resolve_email_content_uses_custom_values(admin_user):
    job = _make_job(admin_user)
    job.email_subject = "Custom subject"
    job.email_body = "Custom body"

    subject, body = ExportTaskHelper.resolve_email_content(job)

    assert subject == "Custom subject"
    assert body == "Custom body"


def test_export_task_helper_finalize_delete_marks_completed(admin_user):
    job = _make_job(admin_user)
    email_log = EmailLog.objects.create(
        subject="done",
        body="body",
        from_email="noreply@example.com",
        to_emails=["admin@example.com"],
        status=EmailLog.Status.SENT,
        created_by=admin_user,
    )
    job.email_status = ExportJob.EmailStatus.SENT
    job.email_log = email_log
    job.absolute_path = str(Path("/tmp/export.csv"))
    job.save(update_fields=["email_status", "email_log", "absolute_path", "updated_at"])

    ExportTaskHelper.finalize_delete(job, deleted=True)
    job.refresh_from_db()

    assert job.file_status == ExportJob.FileStatus.DELETED
    assert job.status == ExportJob.Status.COMPLETED
    assert job.absolute_path == ""
    assert job.metadata["cleanup"]["deleted"] is True
