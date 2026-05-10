from __future__ import annotations

import mimetypes
from pathlib import Path
from typing import cast

from django.core.files.uploadedfile import SimpleUploadedFile

from exporter.models import ExportJob
from exporter.services.export_service import ExportResult, ExportService


class ExportTaskHelper:
    @staticmethod
    def default_email_subject(*, model_name: str, file_type: str) -> str:
        return f"{model_name.title()} export ({file_type.upper()})"

    @staticmethod
    def default_email_body(*, model_name: str) -> str:
        return f"Your {model_name} export is attached."

    @staticmethod
    def error_data(exc: Exception) -> dict[str, str]:
        return {
            "type": exc.__class__.__name__,
            "message": str(exc),
        }

    @staticmethod
    def load_job(job_id: int, *, with_creator: bool = False) -> ExportJob:
        queryset = ExportJob.objects
        if with_creator:
            queryset = queryset.select_related("created_by")
        return cast(ExportJob, queryset.get(pk=job_id))

    @staticmethod
    def mark_processing(job: ExportJob) -> None:
        job.status = ExportJob.Status.PROCESSING
        job.save(update_fields=["status", "updated_at"])

    @classmethod
    def record_retry(
        cls,
        job: ExportJob,
        *,
        stage: str,
        exc: Exception,
        retry_count: int,
    ) -> None:
        job.metadata = {
            **job.metadata,
            f"{stage}_retry": {
                "count": retry_count,
                **cls.error_data(exc),
            },
        }
        job.save(update_fields=["metadata", "updated_at"])

    @classmethod
    def mark_file_create_failure(cls, job: ExportJob, exc: Exception) -> None:
        job.status = ExportJob.Status.FAILED
        job.file_status = ExportJob.FileStatus.CREATE_FAILED
        job.error_message = str(exc)
        job.metadata = {**job.metadata, "file_create_error": cls.error_data(exc)}
        job.save(
            update_fields=[
                "status",
                "file_status",
                "error_message",
                "metadata",
                "updated_at",
            ]
        )

    @classmethod
    def mark_file_created(cls, job: ExportJob, export_result: ExportResult) -> None:
        job.file_status = ExportJob.FileStatus.CREATED
        job.row_count = export_result.row_count
        job.file_name = export_result.file_name
        job.relative_path = export_result.relative_path
        job.absolute_path = str(export_result.absolute_path)
        job.error_message = ""
        job.metadata = {
            **job.metadata,
            "file": {
                "name": export_result.file_name,
                "relative_path": export_result.relative_path,
                "absolute_path": str(export_result.absolute_path),
                "row_count": export_result.row_count,
                "fields": export_result.fields,
            },
        }
        job.save(
            update_fields=[
                "file_status",
                "row_count",
                "file_name",
                "relative_path",
                "absolute_path",
                "error_message",
                "metadata",
                "updated_at",
            ]
        )

    @staticmethod
    def success_payload(job: ExportJob) -> dict:
        return {
            "job_id": job.id,
            "absolute_path": job.absolute_path,
            "file_created": True,
            "email_sent": False,
        }

    @staticmethod
    def skip_email(payload: dict, job: ExportJob) -> dict:
        job.email_status = ExportJob.EmailStatus.SKIPPED
        job.save(update_fields=["email_status", "updated_at"])
        payload["email_sent"] = False
        return payload

    @staticmethod
    def build_attachment(absolute_path: str) -> SimpleUploadedFile:
        file_path = Path(absolute_path)
        content_type = (
            mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        )
        return SimpleUploadedFile(
            file_path.name,
            file_path.read_bytes(),
            content_type=content_type,
        )

    @classmethod
    def resolve_email_content(cls, job: ExportJob) -> tuple[str, str]:
        subject = job.email_subject or cls.default_email_subject(
            model_name=job.model_name,
            file_type=job.file_type,
        )
        body = job.email_body or cls.default_email_body(model_name=job.model_name)
        return subject, body

    @classmethod
    def mark_email_failure(cls, job: ExportJob, exc: Exception) -> None:
        job.email_status = ExportJob.EmailStatus.FAILED
        job.status = ExportJob.Status.FAILED
        job.error_message = str(exc)
        job.metadata = {**job.metadata, "email_error": cls.error_data(exc)}
        job.save(
            update_fields=[
                "email_status",
                "status",
                "error_message",
                "metadata",
                "updated_at",
            ]
        )

    @staticmethod
    def mark_email_sent(job: ExportJob, email_log) -> None:
        job.email_status = ExportJob.EmailStatus.SENT
        job.email_log = email_log
        job.error_message = ""
        job.metadata = {
            **job.metadata,
            "email": {
                "email_log_id": email_log.id,
                "status": email_log.status,
            },
        }
        job.save(
            update_fields=[
                "email_status",
                "email_log",
                "error_message",
                "metadata",
                "updated_at",
            ]
        )

    @staticmethod
    def cleanup_failed_export_file(job: ExportJob) -> bool:
        if not job.absolute_path:
            return True

        deleted = ExportService().delete_export(absolute_path=job.absolute_path)
        job.file_status = (
            ExportJob.FileStatus.DELETED
            if deleted
            else ExportJob.FileStatus.DELETE_FAILED
        )
        if deleted:
            job.absolute_path = ""

        job.metadata = {
            **job.metadata,
            "cleanup": {
                "deleted": deleted,
                "trigger": "failure_cleanup",
            },
        }
        job.save(
            update_fields=["file_status", "absolute_path", "metadata", "updated_at"]
        )
        return deleted

    @classmethod
    def mark_file_delete_failure(cls, job: ExportJob, exc: Exception) -> None:
        job.file_status = ExportJob.FileStatus.DELETE_FAILED
        job.status = ExportJob.Status.FAILED
        job.error_message = str(exc)
        job.metadata = {**job.metadata, "file_delete_error": cls.error_data(exc)}
        job.save(
            update_fields=[
                "file_status",
                "status",
                "error_message",
                "metadata",
                "updated_at",
            ]
        )

    @staticmethod
    def finalize_without_file(job: ExportJob) -> None:
        job.status = ExportJob.Status.COMPLETED_WITH_ERRORS
        job.save(update_fields=["status", "updated_at"])

    @staticmethod
    def finalize_delete(job: ExportJob, *, deleted: bool) -> None:
        if deleted:
            job.file_status = ExportJob.FileStatus.DELETED
            job.status = (
                ExportJob.Status.COMPLETED
                if job.email_status == ExportJob.EmailStatus.SENT
                else ExportJob.Status.COMPLETED_WITH_ERRORS
            )
            job.absolute_path = ""
        else:
            job.file_status = ExportJob.FileStatus.DELETE_FAILED
            job.status = ExportJob.Status.FAILED

        job.metadata = {
            **job.metadata,
            "cleanup": {
                "deleted": deleted,
                "email_status": job.email_status,
            },
        }
        job.save(
            update_fields=[
                "file_status",
                "status",
                "absolute_path",
                "metadata",
                "updated_at",
            ]
        )
