from exporter.exportFactory.base_exporter import BaseExporter
from exporter.exportFactory.csv_exporter import CSVExporter
from exporter.exportFactory.excel_exporter import ExcelExporter


class ExporterFactory:
    _exporters: dict[str, type[BaseExporter]] = {
        "csv": CSVExporter,
        "excel": ExcelExporter,
        "xlsx": ExcelExporter,
    }

    @classmethod
    def create(cls, file_type: str) -> BaseExporter:
        normalized = file_type.strip().lower()
        try:
            return cls._exporters[normalized]()
        except KeyError as exc:
            raise ValueError(f"Unsupported file type: {file_type}") from exc

    @classmethod
    def supported_types(cls) -> list[str]:
        return ["csv", "excel"]
