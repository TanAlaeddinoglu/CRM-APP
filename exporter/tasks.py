from __future__ import annotations

from celery import chain, shared_task
from django.db import OperationalError

from exporter.task_helpers import ExportTaskHelper
from exporter.services.export_service import ExportService
from notifications.exceptions import EmailDeliveryError
from notifications.services import send_email_notification

MAX_RETRIES = 3


def _retry_or_continue(task, *, job, stage: str, exc: Exception) -> bool:
    if task.request.retries < MAX_RETRIES:
        ExportTaskHelper.record_retry(
            job,
            stage=stage,
            exc=exc,
            retry_count=task.request.retries + 1,
        )
        countdown = min(60, 2 ** max(task.request.retries, 0))
        raise task.retry(exc=exc, countdown=countdown)
    return False


def queue_export_delivery(*, job_id: int):
    workflow = chain(
        create_export_file_task.si(job_id=job_id),
        send_export_email_task.s(),
        delete_export_file_task.s(),
    )
    return workflow.apply_async()


@shared_task(bind=True, max_retries=MAX_RETRIES)
def create_export_file_task(self, *, job_id: int):
    job = ExportTaskHelper.load_job(job_id, with_creator=True)
    ExportTaskHelper.mark_processing(job)

    try:
        export_result = ExportService().create_export(
            user=job.created_by,
            model_name=job.model_name,
            file_type=job.file_type,
            fields=job.selected_fields,
        )
    except (OperationalError, OSError) as exc:
        _retry_or_continue(self, job=job, stage="file_create", exc=exc)
        ExportTaskHelper.mark_file_create_failure(job, exc)
        raise
    except Exception as exc:
        ExportTaskHelper.mark_file_create_failure(job, exc)
        raise

    ExportTaskHelper.mark_file_created(job, export_result)
    return ExportTaskHelper.success_payload(job)


@shared_task(bind=True, max_retries=MAX_RETRIES)
def send_export_email_task(self, payload: dict):
    job = ExportTaskHelper.load_job(payload["job_id"], with_creator=True)

    if not payload.get("file_created") or not job.absolute_path:
        return ExportTaskHelper.skip_email(payload, job)

    try:
        attachment = ExportTaskHelper.build_attachment(job.absolute_path)
        subject, body = ExportTaskHelper.resolve_email_content(job)
        email_log = send_email_notification(
            subject=subject,
            body=body,
            to_emails=[job.recipient_email],
            created_by=job.created_by,
            attachments=[attachment],
        )
    except (EmailDeliveryError, OSError) as exc:
        _retry_or_continue(self, job=job, stage="email_send", exc=exc)
        ExportTaskHelper.mark_email_failure(job, exc)
        ExportTaskHelper.cleanup_failed_export_file(job)
        raise
    except Exception as exc:
        ExportTaskHelper.mark_email_failure(job, exc)
        ExportTaskHelper.cleanup_failed_export_file(job)
        raise

    ExportTaskHelper.mark_email_sent(job, email_log)
    payload["email_sent"] = True
    return payload


@shared_task(bind=True, max_retries=MAX_RETRIES)
def delete_export_file_task(self, payload: dict):
    job = ExportTaskHelper.load_job(payload["job_id"])

    if not job.absolute_path:
        ExportTaskHelper.finalize_without_file(job)
        payload["file_deleted"] = True
        return payload

    try:
        deleted = ExportService().delete_export(absolute_path=job.absolute_path)
    except OSError as exc:
        _retry_or_continue(self, job=job, stage="file_delete", exc=exc)
        ExportTaskHelper.mark_file_delete_failure(job, exc)
        payload["file_deleted"] = False
        return payload
    except Exception as exc:
        ExportTaskHelper.mark_file_delete_failure(job, exc)
        payload["file_deleted"] = False
        return payload

    payload["file_deleted"] = deleted
    ExportTaskHelper.finalize_delete(job, deleted=deleted)
    return payload
