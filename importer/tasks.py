from __future__ import annotations

from celery import shared_task

from importer.exceptions import ImportJobError, ImporterNotFound
from importer.models import ImportJob
from importer.registry import registry


@shared_task(bind=True, name="importer.tasks.run_import_job")
def run_import_job(self, job_id: int) -> dict:
    """
    Celery task that processes an ImportJob asynchronously.

    Currently the API uses ImportService.start() synchronously.
    This task is scaffolded for future async workflows.
    """
    try:
        job = ImportJob.objects.get(id=job_id)
    except ImportJob.DoesNotExist:
        raise ImportJobError(f"ImportJob id={job_id} bulunamadı.")

    importer_class = registry.get(job.model_key)
    importer = importer_class(actor=job.created_by, job=job)

    stored = job.preview_result or {}
    rows = stored.get("valid_rows") or []

    if not rows:
        job.status = ImportJob.Status.FAILED
        job.save(update_fields=["status", "updated_at"])
        raise ImportJobError("Import edilecek geçerli satır bulunamadı.")

    try:
        result = importer.import_rows(rows)
        job.status = ImportJob.Status.DONE
        job.success_count = result.get("success_count", 0)
        job.error_count = result.get("error_count", 0)
        job.skipped_count = result.get("skipped_count", 0)
        job.save(
            update_fields=[
                "status",
                "success_count",
                "error_count",
                "skipped_count",
                "updated_at",
            ]
        )
        return result
    except (ImporterNotFound, ImportJobError):
        raise
    except Exception as exc:
        job.status = ImportJob.Status.FAILED
        job.save(update_fields=["status", "updated_at"])
        raise ImportJobError(str(exc)) from exc
