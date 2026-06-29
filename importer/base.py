from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from importer.models import ImportJob


class BaseImporter(ABC):
    """
    Domain-specific importer base class.

    Subclasses must set `model_key` and implement `preview` and `import_rows`.
    The importer must never call Customer.objects.create() or similar directly —
    it must delegate all persistence to the domain service (e.g. CustomerService).
    """

    model_key: str

    def __init__(self, *, actor, job: "ImportJob | None" = None):
        self.actor = actor
        self.job = job

    @abstractmethod
    def preview(self, rows: list[dict]) -> dict:
        """
        Validate and classify rows.

        Returns a dict compatible with PreviewResult.to_dict():
        {valid_count, invalid_count, duplicate_count, total, rows, valid_rows}.
        """

    @abstractmethod
    def import_rows(self, rows: list[dict]) -> dict:
        """
        Persist valid rows via the domain service.

        Must return: {success_count, error_count, skipped_count}.
        Must NEVER call Model.objects.create() or bulk_create() directly.
        """

    def get_column_mapping(self) -> dict[str, str]:
        """
        Suggested {excel_column: target_field} mapping for the columns endpoint.
        Subclasses override to provide domain-specific auto-detection.
        """
        return {}

    def get_target_fields(self) -> list[dict]:
        """
        List of importable target fields for this domain.
        Each entry: {"value": "field_name", "label": "Human Label"}.
        Used to populate the mapping screen dropdown.
        Subclasses override.
        """
        return []
