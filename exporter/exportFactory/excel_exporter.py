from io import BytesIO
from datetime import datetime, time

from openpyxl import Workbook

from exporter.exportFactory.base_exporter import BaseExporter


class ExcelExporter(BaseExporter):
    file_type = "excel"
    file_extension = "xlsx"

    def export(self, headers: list[str], rows: list[list[object]]) -> bytes:
        workbook = Workbook()
        worksheet = workbook.active
        worksheet.title = "Export"
        worksheet.append(headers)
        for row in rows:
            worksheet.append([self._normalize_cell(value) for value in row])

        buffer = BytesIO()
        workbook.save(buffer)
        return buffer.getvalue()

    @staticmethod
    def _normalize_cell(value: object) -> object:
        if isinstance(value, datetime) and value.tzinfo is not None:
            return value.replace(tzinfo=None)

        if isinstance(value, time) and value.tzinfo is not None:
            return value.replace(tzinfo=None)

        return value
