from __future__ import annotations

from typing import TYPE_CHECKING

from importer.exceptions import ImporterNotFound

if TYPE_CHECKING:
    from importer.base import BaseImporter


class ImporterRegistry:
    """Singleton registry mapping model_key strings to importer classes."""

    def __init__(self):
        self._registry: dict[str, type[BaseImporter]] = {}

    def register(self, model_key: str, importer_class: type[BaseImporter]) -> None:
        self._registry[model_key] = importer_class

    def get(self, model_key: str) -> type[BaseImporter]:
        try:
            return self._registry[model_key]
        except KeyError:
            raise ImporterNotFound(
                f"No importer registered for model_key='{model_key}'. "
                f"Available keys: {list(self._registry.keys())}"
            )

    def keys(self) -> list[str]:
        return list(self._registry.keys())


registry = ImporterRegistry()
