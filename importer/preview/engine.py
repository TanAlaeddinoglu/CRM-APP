from __future__ import annotations

from importer.preview.base import BasePreviewChecker
from importer.preview.result import PreviewResult


class PreviewEngine:
    """Thin orchestrator that delegates row classification to a domain checker."""

    def run(self, rows: list[dict], checker: BasePreviewChecker) -> PreviewResult:
        return checker.check(rows)
