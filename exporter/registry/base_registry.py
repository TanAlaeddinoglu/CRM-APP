from __future__ import annotations

from abc import ABC
from dataclasses import dataclass


@dataclass(frozen=True)
class ExportDataset:
    headers: list[str]
    rows: list[list[object]]
    fields: list[str]


class BaseExportRegistry(ABC):
    model_name = ""
    default_fields: list[str] = []
    field_map: dict[str, str] = {}

    @classmethod
    def register(cls) -> None:
        ExportRegistry.register(cls())

    def get_queryset(self, user):
        raise NotImplementedError

    def get_field_value(self, obj, field: str):
        accessor = self.field_map[field]
        value = obj
        for part in accessor.split("."):
            value = getattr(value, part, None)
            if value is None:
                return None
        return value() if callable(value) else value

    def get_allowed_fields(self) -> list[str]:
        return list(self.field_map.keys())

    def resolve_fields(self, fields: list[str] | None) -> list[str]:
        selected_fields = fields or self.default_fields
        invalid_fields = [
            field for field in selected_fields if field not in self.get_allowed_fields()
        ]
        if invalid_fields:
            invalid = ", ".join(sorted(invalid_fields))
            raise ValueError(f"Unsupported fields: {invalid}")
        return selected_fields

    def build_dataset(self, user, fields: list[str] | None = None) -> ExportDataset:
        selected_fields = self.resolve_fields(fields)
        rows = []
        for obj in self.get_queryset(user):
            rows.append([self.get_field_value(obj, field) for field in selected_fields])
        return ExportDataset(headers=selected_fields, rows=rows, fields=selected_fields)


class ExportRegistry:
    _registries: dict[str, BaseExportRegistry] = {}

    @classmethod
    def register(cls, registry: BaseExportRegistry) -> None:
        cls._registries[registry.model_name] = registry

    @classmethod
    def get(cls, model_name: str) -> BaseExportRegistry:
        normalized = model_name.strip().lower()
        try:
            return cls._registries[normalized]
        except KeyError as exc:
            raise KeyError(normalized) from exc

    @classmethod
    def clear(cls) -> None:
        cls._registries = {}
