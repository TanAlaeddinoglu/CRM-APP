from __future__ import annotations

from importer.exceptions import ImportJobError, ImportSourceError
from importer.models import ImportJob
from importer.registry import registry
from importer.sources.csv import CSVImportSource
from importer.sources.excel import ExcelImportSource
from importer.sources.webhook import WebhookImportSource

SOURCE_CLASS_MAP = {
    "excel": ExcelImportSource,
    "csv": CSVImportSource,
    "webhook": WebhookImportSource,
}


def _apply_mapping(rows: list[dict], mapping: dict[str, str]) -> list[dict]:
    """
    Rename row keys using the user-provided mapping; drop unmapped data keys.
    _meta keys (starting with _) are always preserved.
    """
    result = []
    for row in rows:
        out: dict = {}
        for k, v in row.items():
            if k.startswith("_"):
                out[k] = v
                continue
            target = mapping.get(k)
            if target:
                out[target] = v
        result.append(out)
    return result


class ImportService:
    """
    Generic orchestrator for import operations.

    Does not know about any domain's field names or business rules.
    All domain logic lives in the importer registered under `model_key`.
    """

    @staticmethod
    def get_columns(
        *,
        model_key: str,
        source_type: str,
        file=None,
        rows: list[dict] | None = None,
    ) -> dict:
        """
        Read raw column names from the source file/rows without creating an ImportJob.

        Returns:
          columns       — list of raw column names from the file
          sample_rows   — first 3 data rows (raw, with _row_no)
          suggested_mapping — {excel_col: target_field} from the domain importer
          target_fields — [{value, label}] list for the mapping UI dropdown
        """
        source_class = SOURCE_CLASS_MAP.get(source_type)
        if source_class is None:
            raise ImportSourceError(
                f"Bilinmeyen source_type='{source_type}'. "
                f"Geçerli değerler: {list(SOURCE_CLASS_MAP.keys())}"
            )

        source = source_class(rows or []) if source_type == "webhook" else source_class(file)

        try:
            raw_rows = source.read()
        except ImportSourceError:
            raise

        columns = [k for k in (raw_rows[0].keys() if raw_rows else []) if not k.startswith("_")]
        sample_rows = raw_rows[:3]

        importer_class = registry.get(model_key)
        importer = importer_class(actor=None)

        return {
            "columns": columns,
            "sample_rows": sample_rows,
            "suggested_mapping": importer.get_column_mapping(),
            "target_fields": importer.get_target_fields(),
        }

    @staticmethod
    def preview(
        *,
        model_key: str,
        source_type: str,
        actor,
        file=None,
        rows: list[dict] | None = None,
        mapping: dict[str, str] | None = None,
    ) -> dict:
        """
        Read rows from the source, run domain preview, persist an ImportJob.

        If `mapping` is provided, column names are renamed before the domain
        importer sees the rows (user-defined mapping overrides auto-detection).

        Returns the preview dict (from PreviewResult.to_dict()) merged with job_id.
        """
        source_class = SOURCE_CLASS_MAP.get(source_type)
        if source_class is None:
            raise ImportSourceError(
                f"Bilinmeyen source_type='{source_type}'. "
                f"Geçerli değerler: {list(SOURCE_CLASS_MAP.keys())}"
            )

        if source_type == "webhook":
            source = source_class(rows or [])
        else:
            source = source_class(file)

        try:
            raw_rows = source.read()
        except ImportSourceError:
            raise

        if mapping:
            raw_rows = _apply_mapping(raw_rows, mapping)

        importer_class = registry.get(model_key)
        importer = importer_class(actor=actor)

        preview_result = importer.preview(raw_rows)

        job = ImportJob.objects.create(
            model_key=model_key,
            source_type=source_type,
            file=file if source_type not in ("webhook", "csv") else None,
            status=ImportJob.Status.PREVIEWED,
            total_rows=preview_result.get("total", 0),
            preview_result=preview_result,
            created_by=actor if hasattr(actor, "pk") else None,
        )

        return {"job_id": job.id, **preview_result}

    @staticmethod
    def start(*, job_id: int, actor, rows: list[dict] | None = None) -> dict:
        """
        Run the actual import for a previously previewed job.

        `rows` contains the final user-edited ok rows from the frontend.
        If omitted, falls back to valid_rows stored in ImportJob.preview_result.
        """
        try:
            job = ImportJob.objects.get(id=job_id)
        except ImportJob.DoesNotExist:
            raise ImportJobError(f"ImportJob id={job_id} bulunamadı.")

        if job.status == ImportJob.Status.DONE:
            raise ImportJobError(f"ImportJob id={job_id} zaten tamamlandı.")

        import_rows = rows
        if not import_rows:
            stored = job.preview_result or {}
            import_rows = stored.get("valid_rows") or []

        if not import_rows:
            raise ImportJobError("Import edilecek geçerli satır bulunamadı.")

        job.status = ImportJob.Status.RUNNING
        job.save(update_fields=["status", "updated_at"])

        importer_class = registry.get(job.model_key)
        importer = importer_class(actor=actor, job=job)

        try:
            result = importer.import_rows(import_rows)
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
        except Exception as exc:
            job.status = ImportJob.Status.FAILED
            job.save(update_fields=["status", "updated_at"])
            raise ImportJobError(str(exc)) from exc
