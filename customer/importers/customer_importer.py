from __future__ import annotations

from importer.base import BaseImporter
from importer.preview.engine import PreviewEngine


class CustomerImporter(BaseImporter):
    """
    Customer-specific importer.

    preview() — maps + validates rows, returns PreviewResult dict.
    import_rows() — delegates persistence to CustomerService.bulk_create().
                    Never calls Customer.objects.create() or bulk_create() directly.
    """

    model_key = "customer"

    def preview(self, rows: list[dict]) -> dict:
        from customer.importers.customer_mapper import CustomerImportMapper
        from customer.importers.customer_preview import CustomerPreviewChecker

        mapped = [CustomerImportMapper.map_row(r) for r in rows]
        result = PreviewEngine().run(mapped, CustomerPreviewChecker())
        return result.to_dict()

    def get_column_mapping(self) -> dict[str, str]:
        from customer.importers.customer_mapper import CustomerImportMapper
        return CustomerImportMapper.FIELD_MAP.copy()

    def get_target_fields(self) -> list[dict]:
        return [
            {"value": "customer_name",     "label": "Ad"},
            {"value": "customer_surname",  "label": "Soyad"},
            {"value": "customer_name_full","label": "Ad Soyad"},
            {"value": "customer_email",    "label": "E-posta"},
            {"value": "customer_phone",    "label": "Telefon"},
            {"value": "city",              "label": "Şehir"},
            {"value": "status",            "label": "Durum"},
            {"value": "source",            "label": "Kaynak"},
            {"value": "products",          "label": "Ürünler"},
        ]

    def import_rows(self, rows: list[dict]) -> dict:
        """
        Import valid rows via CustomerService.bulk_create().

        `rows` arrive already validated and cleaned (output of preview valid_rows).
        Internal _meta keys (starting with _) are stripped before passing to the service.
        """
        from customer.services import CustomerService
        from importer.models import ImportRow

        payload = [
            {k: v for k, v in row.items() if not k.startswith("_")}
            for row in rows
        ]

        result = CustomerService.bulk_create(payload, self.actor)
        created_count = result.get("created_count", 0)

        if self.job:
            import_rows_bulk = [
                ImportRow(
                    job=self.job,
                    row_index=idx,
                    raw_data=row,
                    normalized_data={k: v for k, v in row.items() if not k.startswith("_")},
                    status=ImportRow.Status.OK,
                )
                for idx, row in enumerate(rows)
            ]
            ImportRow.objects.bulk_create(import_rows_bulk, batch_size=500)

        return {
            "success_count": created_count,
            "error_count": 0,
            "skipped_count": 0,
            "created_count": created_count,
        }
