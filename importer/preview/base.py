from __future__ import annotations

from abc import ABC, abstractmethod

from importer.preview.result import PreviewResult


class BasePreviewChecker(ABC):
    """
    Domain-specific row validator and classifier.

    Implementations know about the domain's field names, validation rules,
    and duplicate detection strategies.  The `importer` app itself never
    imports these classes directly — they are registered at app startup.
    """

    @abstractmethod
    def check(self, rows: list[dict]) -> PreviewResult:
        """Classify rows into valid, invalid, and duplicate buckets."""
