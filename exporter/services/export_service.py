from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from exporter.exportFactory.factory import ExporterFactory
from exporter.registry.base_registry import ExportRegistry
from exporter.services.file_service import FileService


@dataclass(frozen=True)
class ExportResult:
    model_name: str
    file_type: str
    fields: list[str]
    row_count: int
    file_name: str
    relative_path: str
    absolute_path: Path


class ExportService:
    def __init__(self, file_service: FileService | None = None):
        self.file_service = file_service or FileService()

    def create_export(
        self,
        *,
        user,
        model_name: str,
        file_type: str,
        fields: list[str] | None = None,
    ) -> ExportResult:
        registry = ExportRegistry.get(model_name)
        dataset = registry.build_dataset(user=user, fields=fields)
        exporter = ExporterFactory.create(file_type)
        content = exporter.export(headers=dataset.headers, rows=dataset.rows)
        saved_file = self.file_service.save(
            model_name=model_name,
            extension=exporter.file_extension,
            content=content,
        )
        return ExportResult(
            model_name=model_name,
            file_type=exporter.file_type,
            fields=dataset.fields,
            row_count=len(dataset.rows),
            file_name=saved_file.file_name,
            relative_path=saved_file.relative_path,
            absolute_path=saved_file.absolute_path,
        )

    def delete_export(
        self,
        *,
        absolute_path: Path | str | None = None,
        relative_path: str | None = None,
    ) -> bool:
        return self.file_service.delete(
            absolute_path=absolute_path,
            relative_path=relative_path,
        )
