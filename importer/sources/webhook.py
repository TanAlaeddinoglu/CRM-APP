from __future__ import annotations

from importer.sources.base import BaseImportSource


class WebhookImportSource(BaseImportSource):
    """
    Passthrough source for rows that arrive directly in the request body.
    Used when the frontend sends pre-processed rows (e.g., webhook payloads).
    """

    def __init__(self, rows: list[dict]):
        self._rows = rows or []

    def read(self) -> list[dict]:
        return list(self._rows)
