import csv
from io import StringIO

from exporter.exportFactory.base_exporter import BaseExporter


class CSVExporter(BaseExporter):
    file_type = "csv"
    file_extension = "csv"

    def export(self, headers: list[str], rows: list[list[object]]) -> bytes:
        buffer = StringIO()
        writer = csv.writer(buffer)
        writer.writerow(headers)
        writer.writerows(rows)
        return buffer.getvalue().encode("utf-8")
