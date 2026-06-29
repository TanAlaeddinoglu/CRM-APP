from __future__ import annotations

import re

from importer.preview.base import BasePreviewChecker
from importer.preview.duplicate import find_file_duplicates
from importer.preview.result import PreviewResult


def _phone_candidates(phone: str) -> set[str]:
    """Return a phone and its +/- variant for DB lookup."""
    digits = re.sub(r"\D", "", str(phone or ""))
    if not digits:
        return set()
    return {digits, f"+{digits}"}


class CustomerPreviewChecker(BasePreviewChecker):
    """
    Validates and classifies customer import rows.

    Uses CustomerBulkCreateItemSerializer for per-row field validation,
    then checks for file-level and DB-level phone duplicates.
    Does not know about the importer/ app internals.
    """

    def check(self, rows: list[dict]) -> PreviewResult:
        valid: list[dict] = []
        invalid: list[dict] = []

        from customer.bulkSerilaizer import CustomerBulkCreateItemSerializer
        from customer.importers.customer_mapper import CustomerImportMapper
        from customer.models import Customer

        for row in rows:
            # Apply phone/source normalisation before serializer validation
            cleaned = CustomerImportMapper.clean_payload(row)
            data = {k: v for k, v in cleaned.items() if not k.startswith("_")}
            row_no = row.get("_row_no")

            ser = CustomerBulkCreateItemSerializer(data=data)
            if ser.is_valid():
                validated = dict(ser.validated_data)
                validated["_row_no"] = row_no
                valid.append(validated)
            else:
                error_list = []
                for field, errs in ser.errors.items():
                    for e in errs:
                        error_list.append({"field": field, "message": str(e)})
                invalid.append({
                    **data,
                    "_row_no": row_no,
                    "_status": "invalid",
                    "_errors": error_list,
                })

        # --- File-level duplicate check (by normalized customer_phone) ---
        file_dups = find_file_duplicates(valid, "customer_phone")

        # --- DB-level duplicate check (expand +/- candidates) ---
        candidate_phones: set[str] = set()
        for row in valid:
            candidate_phones |= _phone_candidates(row.get("customer_phone", ""))

        db_phones: set[str] = set()
        if candidate_phones:
            db_phones = set(
                Customer.objects.filter(
                    customer_phone__in=list(candidate_phones)
                ).values_list("customer_phone", flat=True)
            )

        # --- Categorise valid rows ---
        final_valid: list[dict] = []
        duplicate: list[dict] = []

        for idx, row in enumerate(valid):
            phone = row.get("customer_phone", "")
            if idx in file_dups:
                duplicate.append({
                    **row,
                    "_status": "duplicate_in_file",
                    "_reason": "duplicate_in_file",
                    "_first_seen_row": file_dups[idx],
                })
            elif _phone_candidates(phone) & db_phones:
                duplicate.append({
                    **row,
                    "_status": "duplicate_in_db",
                    "_reason": "duplicate_in_db",
                })
            else:
                final_valid.append({**row, "_status": "ok"})

        return PreviewResult(
            valid_rows=final_valid,
            invalid_rows=invalid,
            duplicate_rows=duplicate,
            valid_count=len(final_valid),
            invalid_count=len(invalid),
            duplicate_count=len(duplicate),
            total=len(rows),
        )
