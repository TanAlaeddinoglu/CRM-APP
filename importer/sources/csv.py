from __future__ import annotations

import csv
import io

from importer.exceptions import ImportSourceError
from importer.sources.base import BaseImportSource

MAX_ROWS = 5000


class CSVImportSource(BaseImportSource):
    """Reads a CSV file and returns flat dicts with `_row_no` for each data row."""

    def __init__(self, uploaded_file):
        self.uploaded_file = uploaded_file

    def read(self) -> list[dict]:
        try:
            content = self.uploaded_file.read()
            if isinstance(content, bytes):
                content = content.decode("utf-8-sig")
            reader = csv.DictReader(io.StringIO(content))
            rows = []
            for idx, raw in enumerate(reader):
                if idx >= MAX_ROWS:
                    raise ImportSourceError(
                        f"CSV dosyasında en fazla {MAX_ROWS} satır işlenebilir."
                    )
                row = {"_row_no": idx + 2}
                row.update({str(k).strip(): str(v).strip() for k, v in raw.items()})
                if any(v for k, v in row.items() if not k.startswith("_")):
                    rows.append(row)
            return rows
        except ImportSourceError:
            raise
        except Exception as exc:
            raise ImportSourceError(f"CSV okunamadı: {exc}") from exc
