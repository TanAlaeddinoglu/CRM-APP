import math
import re

from django.apps import apps
from django.contrib.auth import get_user_model

User = get_user_model()

NULLISH = {"", "null", "none", "undefined"}


def _get_customer_fields():
    Customer = apps.get_model("customer", "Customer")
    return {f.name for f in Customer._meta.fields}


def _get_models():
    Tag = apps.get_model("customer", "Tag")
    try:
        Product = apps.get_model("products", "Product")
        CustomerProduct = apps.get_model("products", "CustomerProduct")
    except Exception:
        Product = None
        CustomerProduct = None
    return Tag, Product, CustomerProduct


def _nullish(v) -> bool:
    return v in (None, "", "null", "None", "undefined") or str(v).strip() == ""


def _clean_str(v):
    if v is None:
        return None
    try:
        if isinstance(v, float) and math.isnan(v):
            return None
    except Exception:
        pass
    s = str(v).strip()
    if _nullish(s):
        return None
    return s


def normalize_phone_number(value):
    """
    Ortak telefon normalizasyon fonksiyonu.
    - p: prefix → temizlenir
    - 00... → uluslararası prefix kaldırılır
    - + → kaldırılır, sadece digit saklanır
    - 0XXXXXXXXXX (11 digit Türk yerel) → başına 9 eklenir → 9XXXXXXXXXXX (12 digit)
    - 11-15 digit arası kabul edilir
    - Geçersizse None döner
    """
    if value is None:
        return None
    s = str(value).strip()
    if not s or s.lower() in NULLISH:
        return None
    s = re.sub(r"^p:\s*", "", s, flags=re.IGNORECASE).strip()
    if re.fullmatch(r"\d+(\.0)?", s):
        s = s.split(".")[0]
    if s.startswith("00"):
        s = s[2:]
    s = s.lstrip("+")
    digits = re.sub(r"\D", "", s)
    if not digits:
        return None
    if digits.startswith("0") and len(digits) == 11:
        digits = "9" + digits
    if not (11 <= len(digits) <= 15):
        return None
    return digits


def _safe_int(value):
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def _phone_candidates(phone: str):
    if not phone:
        return set()
    p = str(phone).strip()
    if not p:
        return set()
    digits = p.lstrip("+")
    return {digits, "+" + digits}


def _resolve_products_from_string(products_str: str):
    try:
        from products.product_matching import resolve_products_from_text
        return resolve_products_from_text(products_str).products
    except Exception:
        return []


def _set_customer_products(customer, products_str: str, by_user):
    _, Product, CustomerProduct = _get_models()
    if not customer or not getattr(customer, "id", None):
        return
    if not products_str or _nullish(products_str):
        return
    if not (Product and CustomerProduct):
        return

    products = _resolve_products_from_string(products_str)
    if not products:
        return

    new_ids = {p.id for p in products}
    existing_ids = set(
        CustomerProduct.objects.filter(customer_id=customer.id).values_list(
            "product_id", flat=True
        )
    )

    to_del = list(existing_ids - new_ids)
    to_add = list(new_ids - existing_ids)

    if to_del:
        CustomerProduct.objects.filter(
            customer_id=customer.id, product_id__in=to_del
        ).delete()

    if to_add:
        rows = []
        for pid in to_add:
            kwargs = {"customer_id": customer.id, "product_id": pid}
            if hasattr(CustomerProduct, "created_by_id"):
                kwargs["created_by_id"] = getattr(by_user, "id", None)
            if hasattr(CustomerProduct, "updated_by_id"):
                kwargs["updated_by_id"] = getattr(by_user, "id", None)
            rows.append(CustomerProduct(**kwargs))
        CustomerProduct.objects.bulk_create(rows, ignore_conflicts=True)
