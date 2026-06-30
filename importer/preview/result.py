from __future__ import annotations

from dataclasses import dataclass, field


def _safe_serialize(value):
    """Convert non-JSON-serializable primitives (e.g. date) to string."""
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def _serialize_row(row: dict) -> dict:
    return {k: _safe_serialize(v) for k, v in row.items()}


@dataclass
class PreviewResult:
    valid_rows: list[dict] = field(default_factory=list)
    invalid_rows: list[dict] = field(default_factory=list)
    duplicate_rows: list[dict] = field(default_factory=list)
    valid_count: int = 0
    invalid_count: int = 0
    duplicate_count: int = 0
    total: int = 0

    def to_dict(self) -> dict:
        """
        Serialise to a JSON-safe dict for HTTP responses and ImportJob storage.

        `rows` contains all rows (valid + invalid + duplicate) with a `_status`
        field so the frontend can render a unified editable table.
        `valid_rows` is also included separately so `import_rows()` can pick
        them up without re-running the preview.
        """
        all_rows = []
        for row in self.valid_rows:
            all_rows.append(_serialize_row({**row, "_status": "ok"}))
        for row in self.invalid_rows:
            all_rows.append(_serialize_row({**row, "_status": "invalid"}))
        for row in self.duplicate_rows:
            all_rows.append(_serialize_row(row))

        return {
            "valid_count": self.valid_count,
            "invalid_count": self.invalid_count,
            "duplicate_count": self.duplicate_count,
            "total": self.total,
            "rows": all_rows,
            "valid_rows": [_serialize_row(r) for r in self.valid_rows],
        }
