from __future__ import annotations

from importer.exceptions import ImportSourceError
from importer.sources.base import BaseImportSource

MAX_ROWS = 5000
MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


class ExcelImportSource(BaseImportSource):
    """
    Reads .xlsx files with openpyxl.

    - First row is treated as the header row.
    - Each data row is returned as a flat dict with `_row_no` (1-based Excel row number).
    - Fully empty rows are skipped.
    - Raises ImportSourceError for oversized files, unreadable content, or row limits.
    """

    def __init__(self, uploaded_file):
        self.uploaded_file = uploaded_file

    def read(self) -> list[dict]:
        try:
            import openpyxl
        except ImportError as exc:
            raise ImportSourceError("openpyxl kütüphanesi bulunamadı.") from exc

        try:
            content = self.uploaded_file.read()
        except Exception as exc:
            raise ImportSourceError(f"Dosya okunamadı: {exc}") from exc

        if len(content) > MAX_FILE_SIZE_BYTES:
            raise ImportSourceError(
                f"Dosya boyutu {MAX_FILE_SIZE_MB} MB sınırını aşıyor."
            )

        try:
            import io
            wb = openpyxl.load_workbook(
                io.BytesIO(content), read_only=True, data_only=True
            )
            ws = wb.active
        except Exception as exc:
            raise ImportSourceError(
                f"Excel dosyası açılamadı. Geçerli bir .xlsx dosyası yükleyin. ({exc})"
            ) from exc

        try:
            rows_iter = ws.iter_rows(values_only=True)
        except Exception as exc:
            raise ImportSourceError(f"Excel satırları okunamadı: {exc}") from exc

        # First non-empty row is the header
        headers: list[str] = []
        for header_row in rows_iter:
            headers = [str(cell).strip() if cell is not None else "" for cell in header_row]
            if any(headers):
                break

        if not headers:
            raise ImportSourceError("Excel dosyasında başlık satırı bulunamadı.")

        results: list[dict] = []
        # header row is row 1, data starts at row 2
        excel_row_no = 2

        for raw_row in rows_iter:
            if len(results) >= MAX_ROWS:
                raise ImportSourceError(
                    f"Excel dosyasında en fazla {MAX_ROWS} satır işlenebilir."
                )

            row_dict: dict = {}
            for header, cell_value in zip(headers, raw_row):
                if not header:
                    excel_row_no += 1
                    continue
                row_dict[header] = _cell_to_str(cell_value)

            # Skip fully empty rows
            if any(v for v in row_dict.values()):
                row_dict["_row_no"] = excel_row_no
                results.append(row_dict)

            excel_row_no += 1

        wb.close()
        return results


def _cell_to_str(value) -> str:
    """Convert an openpyxl cell value to a clean string."""
    if value is None:
        return ""
    if isinstance(value, float):
        # Avoid '1.0' for whole numbers stored as float in Excel
        if value == int(value):
            return str(int(value))
        return str(value)
    return str(value).strip()
