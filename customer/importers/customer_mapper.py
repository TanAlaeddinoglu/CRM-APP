from __future__ import annotations

from common.utils import SOURCE_CHOICES
from customer.helpers import normalize_phone_number

VALID_SOURCES = {value for value, _ in SOURCE_CHOICES}

# Fields accepted by CustomerBulkCreateItemSerializer / CustomerService.bulk_create
TARGET_FIELDS = {
    "customer_name",
    "customer_surname",
    "customer_email",
    "customer_phone",
    "date_of_birth",
    "city",
    "status",
    "source",
    "assigned_to",
    "tag",
    "products",
}


def _normalize_source(value: str) -> str:
    text = str(value or "").strip().lower()
    if text in VALID_SOURCES:
        return text
    if "instagram" in text:
        return "instagram"
    if "whatsapp" in text:
        return "whatsapp"
    if "google" in text:
        return "google ads"
    if "meta" in text or "facebook" in text:
        return "meta"
    return "excel"


class CustomerImportMapper:
    """
    Maps raw import rows (e.g. Turkish Excel headers) to Customer field names.

    FIELD_MAP handles column headers from Excel files.
    Rows that arrive already in Customer field format (webhook rows) pass
    through unchanged because the fallback is the original key.
    """

    FIELD_MAP: dict[str, str] = {
        "Ad": "customer_name",
        "Soyad": "customer_surname",
        "Ad Soyad": "customer_name_full",
        "Email": "customer_email",
        "Telefon": "customer_phone",
        "Şehir": "city",
        "Kaynak": "source",
    }

    @classmethod
    def map_row(cls, row: dict) -> dict:
        """
        Rename raw keys using FIELD_MAP, drop unknown keys, preserve _meta keys.

        Unknown keys that are already valid Customer fields pass through.
        Unknown keys that are not Customer fields are silently dropped.
        customer_name_full is a virtual field: split on last whitespace into
        customer_name + customer_surname (consumed here, not in TARGET_FIELDS).
        """
        out: dict = {}
        if "_row_no" in row:
            out["_row_no"] = row["_row_no"]
        for key, value in row.items():
            if key.startswith("_"):
                continue
            target = cls.FIELD_MAP.get(key, key)

            if target == "customer_name_full":
                parts = str(value or "").strip().rsplit(None, 1)
                out["customer_name"] = parts[0] if parts else ""
                if len(parts) == 2:
                    out.setdefault("customer_surname", parts[1])
                continue

            if target in TARGET_FIELDS:
                out[target] = value
        return out

    @classmethod
    def clean_payload(cls, payload: dict) -> dict:
        """Normalise phone and source values; leave other fields untouched."""
        out = dict(payload)
        phone = out.get("customer_phone")
        if phone is not None:
            normalized = normalize_phone_number(phone)
            if normalized:
                out["customer_phone"] = normalized
        if out.get("source"):
            out["source"] = _normalize_source(out["source"])
        return out
