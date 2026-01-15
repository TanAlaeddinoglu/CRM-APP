# customer/views.py

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, SAFE_METHODS
from rest_framework.exceptions import ValidationError, NotFound
from rest_framework import status, viewsets, filters, serializers

from django.contrib.auth import get_user_model
from django.db import transaction, IntegrityError

from accounts.authenticate import CustomAuthentication
from common.pagination import CustomPagination
from .filters import CustomerFilter, TagHistoryFilter, NoteHistoryFilter
from .serializers import (
    CustomerSerializer,
    CustomerTagHistorySerializer,
    TagSerializer,
    NotesSerializer,
)
from .models import Customer, Tag, CustomerTagHistory, Notes
from .services import is_admin_or_assigned_to_user

from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

import pandas as pd
import re
import unicodedata
import math

from .bulkSerilaizer import (
    CustomerExcelRowSerializer,
)  # sadece serializer burada tanımlı olmalı!

User = get_user_model()

CUSTOMER_FIELDS = {f.name for f in Customer._meta.fields}

NULLISH = {"", "null", "none", "undefined"}

# ---- Products app (safe import) ----
try:
    from products.models import Product, CustomerProduct
except Exception:
    Product = None
    CustomerProduct = None


# -------------------------
# Helpers
# -------------------------
def _nullish(v) -> bool:
    return v in (None, "", "null", "None", "undefined") or str(v).strip() == ""


def _clean_str(v):
    if v is None:
        return None

    # ✅ pandas NaN fix
    try:
        if isinstance(v, float) and math.isnan(v):
            return None
    except Exception:
        pass

    s = str(v).strip()
    if _nullish(s):
        return None
    return s


def _normalize_excel_col(s: str) -> str:
    s = str(s)
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))

    tr_map = str.maketrans(
        {
            "ı": "i",
            "İ": "i",
            "ş": "s",
            "Ş": "s",
            "ğ": "g",
            "Ğ": "g",
            "ü": "u",
            "Ü": "u",
            "ö": "o",
            "Ö": "o",
            "ç": "c",
            "Ç": "c",
        }
    )
    s = s.translate(tr_map)

    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "_", s).strip("_")
    return s


def _normalize_phone(value):
    """
    Ülke kodu tahmini YOK:
    - p:+... -> +... (p: kaldır)
    - 00...  -> +...
    - + ile geldiyse + korunur
    - + yoksa digits döner
    - 8-15 digit arası
    """
    if value is None:
        return None

    s = str(value).strip()
    if not s or s.lower() in NULLISH:
        return None

    s = s.replace("p:", "").strip()

    if re.fullmatch(r"\d+(\.0)?", s):
        s = s.split(".")[0]

    if s.startswith("00"):
        s = "+" + s[2:]

    has_plus = s.startswith("+")
    digits = re.sub(r"\D", "", s)

    if not digits:
        return None

    if not (8 <= len(digits) <= 15):
        return None

    return ("+" + digits) if has_plus else digits


def _phone_candidates(phone: str):
    if not phone:
        return set()
    p = str(phone).strip()
    if not p:
        return set()
    digits = p.lstrip("+")
    return {digits, "+" + digits}


# -------------------------
# ✅ Products helpers
# -------------------------
def _split_products(raw: str):
    """
    Excel/UI 'Products' stringini parçalara böler.
    Örn: "kalınlaştırma, erken boşalma | sertleşme" -> ["kalınlaştırma","erken boşalma","sertleşme"]
    """
    s = (raw or "").strip()
    if not s:
        return []
    parts = re.split(r"[|,;]+", s)
    out = []
    for p in parts:
        p = (p or "").strip()
        if not p:
            continue
        out.append(p)
    return out


def _norm_tr(s: str) -> str:
    """
    TR normalize: aksan sil, ı->i, lower, harf/rakam/boşluk kalsın
    """
    if s is None:
        return ""
    s = str(s).strip()
    if not s:
        return ""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    tr_map = str.maketrans(
        {
            "ı": "i",
            "İ": "i",
            "ş": "s",
            "Ş": "s",
            "ğ": "g",
            "Ğ": "g",
            "ü": "u",
            "Ü": "u",
            "ö": "o",
            "Ö": "o",
            "ç": "c",
            "Ç": "c",
        }
    )
    s = s.translate(tr_map)
    s = s.lower()

    # "penis kalınlaştırma" gibi şeylerde penis kelimesini düşür (opsiyonel ama faydalı)
    s = re.sub(r"\bpenis\b", "", s).strip()

    # sadece a-z0-9 ve boşluk
    s = re.sub(r"[^a-z0-9\s]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _resolve_products_from_string(products_str: str):
    """
    Product objelerini bulur (name/slug normalize map).
    Bulamazsa o token'ı pas geçer.
    """
    if not Product:
        return []

    tokens = _split_products(products_str)
    if not tokens:
        return []

    # mevcut tüm ürünleri maple (küçük dataset için OK)
    qs = Product.objects.all().only("id", "name", "slug")
    by_key = {}
    for p in qs:
        if getattr(p, "name", None):
            by_key[_norm_tr(p.name)] = p
        if getattr(p, "slug", None):
            by_key[_norm_tr(p.slug)] = p

    resolved = []
    seen_ids = set()

    for t in tokens:
        key = _norm_tr(t)
        if not key:
            continue
        p = by_key.get(key)

        # bazı tokenlar "penis eg̃riligi" vs. -> name eşleşmezse küçük heuristik:
        if not p and " " in key:
            # boşluksuz da dene
            p = by_key.get(key.replace(" ", ""))

        if p and p.id not in seen_ids:
            resolved.append(p)
            seen_ids.add(p.id)

    return resolved


def _set_customer_products(customer: Customer, products_str: str, by_user):
    """
    products_str doluysa: customer'ın ürünlerini bu listeye SET eder (ekle/sil farkı uygular).
    products_str boşsa: dokunmaz.
    """
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

    # mevcut ilişkiler
    existing = CustomerProduct.objects.filter(customer_id=customer.id).values_list(
        "product_id", flat=True
    )
    existing_ids = set(existing)

    to_add = list(new_ids - existing_ids)
    to_del = list(existing_ids - new_ids)

    if to_del:
        CustomerProduct.objects.filter(
            customer_id=customer.id, product_id__in=to_del
        ).delete()

    if to_add:
        rows = []
        for pid in to_add:
            kwargs = {
                "customer_id": customer.id,
                "product_id": pid,
            }
            # created_by / updated_by alanları varsa set et
            if hasattr(CustomerProduct, "created_by_id"):
                kwargs["created_by_id"] = getattr(by_user, "id", None)
            if hasattr(CustomerProduct, "updated_by_id"):
                kwargs["updated_by_id"] = getattr(by_user, "id", None)
            rows.append(CustomerProduct(**kwargs))

        # unique constraint varsa ignore_conflicts iyi olur
        CustomerProduct.objects.bulk_create(rows, ignore_conflicts=True)


# -------------------------
# Excel Helpers
# -------------------------
EXCEL_COL_MAP_NORM = {
    "ad": "customer_name",
    "isim": "customer_name",
    "first_name": "customer_name",
    "firstname": "customer_name",
    "name": "customer_name",
    "soyad": "customer_surname",
    "soyadi": "customer_surname",
    "last_name": "customer_surname",
    "lastname": "customer_surname",
    "surname": "customer_surname",
    "telefon": "customer_phone",
    "telefon_numarasi": "customer_phone",
    "telefon_no": "customer_phone",
    "phone": "customer_phone",
    "phone_number": "customer_phone",
    "mobile": "customer_phone",
    "email": "customer_email",
    "e_mail": "customer_email",
    "mail": "customer_email",
    "sehir": "city",
    "city": "city",
    # ✅ products
    "products": "products",
    "hangi_islem_ile_ilgileniyorsunuz": "products",
    "hangi_islem_ile_ilgileniyorsunuz_": "products",
    "lead_status": "lead_status",
}


def _read_excel_to_rows(excel_file):
    df = pd.read_excel(excel_file)

    df.columns = [_normalize_excel_col(c) for c in df.columns]

    rename_map = {}
    for c in df.columns:
        if c in EXCEL_COL_MAP_NORM:
            rename_map[c] = EXCEL_COL_MAP_NORM[c]
    df = df.rename(columns=rename_map)

    # ✅ Fallback: şehir kolonu farklı isimlerle gelebiliyor
    if "city" not in df.columns:
        for c in df.columns:
            if (
                c == "sehir"
                or c.startswith("sehir_")
                or "sehir" in c
                or c == "city"
                or "city" in c
            ):
                df = df.rename(columns={c: "city"})
                break

    required_cols = {"customer_name", "customer_surname", "customer_phone"}
    missing = required_cols - set(df.columns)
    if missing:
        return None, {"detail": f"Eksik kolon(lar): {sorted(missing)}"}

    rows = []
    for i, r in df.iterrows():
        excel_row_no = int(i) + 2

        name = _clean_str(r.get("customer_name"))
        surname = _clean_str(r.get("customer_surname"))
        phone = _normalize_phone(r.get("customer_phone"))
        email = _clean_str(r.get("customer_email"))

        if _nullish(name) and _nullish(surname) and _nullish(phone) and _nullish(email):
            continue

        row_dict = {
            "row": excel_row_no,
            "customer_name": name,
            "customer_surname": surname,
            "customer_phone": phone,
            "customer_email": email,
            "city": _clean_str(r.get("city")),
            "products": _clean_str(r.get("products")),
            "lead_status": _clean_str(r.get("lead_status")),
        }
        rows.append(row_dict)

    return rows, None


def _analyze_rows(rows):
    errors = []
    duplicates = []

    # 1) validate
    validated = []
    for r in rows:
        row_no = r["row"]

        r = {**r}
        r["customer_phone"] = _normalize_phone(r.get("customer_phone"))

        ser = CustomerExcelRowSerializer(data=r)
        if not ser.is_valid():
            errors.append({"row": row_no, "errors": ser.errors})
            continue

        data = dict(ser.validated_data)
        data["customer_phone"] = _normalize_phone(data.get("customer_phone"))

        for extra_key in ["city", "products", "lead_status"]:
            if extra_key in r and extra_key not in data:
                data[extra_key] = r.get(extra_key)

        validated.append({"row": row_no, **data})

    # 2) duplicate in file (key: digits-only)
    seen = {}
    file_unique = []
    for r in validated:
        phone = r.get("customer_phone")
        if _nullish(phone):
            errors.append(
                {"row": r["row"], "errors": {"customer_phone": ["Phone is required."]}}
            )
            continue

        key = str(phone).lstrip("+")  # +905.. ve 905.. aynı kabul
        if key in seen:
            duplicates.append(
                {
                    "row": r["row"],
                    "customer_phone": phone,
                    "reason": "duplicate_in_file",
                    "first_seen_row": seen[key],
                }
            )
            continue

        seen[key] = r["row"]
        file_unique.append(r)

    # 3) duplicate in db (+ / no+ birlikte)
    phones = [r["customer_phone"] for r in file_unique]
    all_candidates = set()
    for p in phones:
        all_candidates |= _phone_candidates(p)

    existing_map = dict(
        Customer.objects.filter(customer_phone__in=list(all_candidates)).values_list(
            "customer_phone", "id"
        )
    )

    preview_rows = []
    for r in file_unique:
        phone = r["customer_phone"]
        cand = _phone_candidates(phone)

        existing_id = None
        for c in cand:
            if c in existing_map:
                existing_id = existing_map[c]
                break

        if existing_id:
            duplicates.append(
                {
                    "row": r["row"],
                    "customer_phone": phone,
                    "reason": "duplicate_in_db",
                    "existing_customer_id": existing_id,
                }
            )
            continue

        preview_rows.append(r)

    counts = {
        "total_rows": len(rows),
        "valid_rows": len(validated),
        "preview_rows": len(preview_rows),
        "duplicates_in_file": sum(
            1 for d in duplicates if d["reason"] == "duplicate_in_file"
        ),
        "duplicates_in_db": sum(
            1 for d in duplicates if d["reason"] == "duplicate_in_db"
        ),
        "errors": len(errors),
    }

    return preview_rows, duplicates, errors, counts


# -------------------------
# Excel Import Views
# -------------------------
class CustomerExcelDryRunView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, *args, **kwargs):
        excel_file = request.FILES.get("file")
        if not excel_file:
            return Response(
                {"detail": "file alanı boş."}, status=status.HTTP_400_BAD_REQUEST
            )

        rows, err = _read_excel_to_rows(excel_file)
        if err:
            return Response(err, status=status.HTTP_400_BAD_REQUEST)

        preview_rows, duplicates, errors, counts = _analyze_rows(rows)

        return Response(
            {
                **counts,
                "preview": preview_rows,
                "duplicates": duplicates,
                "row_errors": errors,
            },
            status=status.HTTP_200_OK,
        )


class CustomerExcelUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, *args, **kwargs):
        excel_file = request.FILES.get("file")
        if not excel_file:
            return Response(
                {"detail": "file alanı boş."}, status=status.HTTP_400_BAD_REQUEST
            )

        rows, err = _read_excel_to_rows(excel_file)
        if err:
            return Response(err, status=status.HTTP_400_BAD_REQUEST)

        preview_rows, duplicates, errors, counts = _analyze_rows(rows)

        jobs = []
        for r in preview_rows:
            email = r.get("customer_email") or None
            phone = _normalize_phone(r.get("customer_phone"))

            city = _clean_str(r.get("city"))
            products_str = _clean_str(r.get("products"))  # ✅ NEW

            c = Customer(
                customer_name=r["customer_name"],
                customer_surname=r["customer_surname"],
                customer_phone=phone,
                created_by=request.user,
                updated_by=request.user,
            )

            if "customer_email" in CUSTOMER_FIELDS:
                c.customer_email = email
            if "email_normalized" in CUSTOMER_FIELDS:
                c.email_normalized = (email or "").lower()
            if "is_active" in CUSTOMER_FIELDS:
                c.is_active = True

            # ✅ şehir
            if "city" in CUSTOMER_FIELDS:
                c.city = city

            # ✅ status/source default: OK satırlar ACTIVE olsun
            if "status" in CUSTOMER_FIELDS and _nullish(getattr(c, "status", None)):
                c.status = "active"
            if "source" in CUSTOMER_FIELDS and _nullish(getattr(c, "source", None)):
                c.source = "excel"

            jobs.append((r["row"], c, products_str))

        created_ids = []
        create_row_errors = []

        if jobs:
            to_create = [c for (_, c, _) in jobs]
            try:
                with transaction.atomic():
                    created = Customer.objects.bulk_create(to_create, batch_size=500)

                    # ✅ Products relation: bulk_create sonrası (id varsa)
                    for idx, obj in enumerate(created):
                        row_no, _, products_str = jobs[idx]
                        if getattr(obj, "id", None):
                            created_ids.append(obj.id)
                        # products set
                        try:
                            if products_str and not _nullish(products_str):
                                _set_customer_products(
                                    obj, products_str, by_user=request.user
                                )
                        except Exception as ex:
                            create_row_errors.append(
                                {
                                    "row": row_no,
                                    "detail": "Products attach failed",
                                    "error": str(ex),
                                    "customer_phone": getattr(
                                        obj, "customer_phone", None
                                    ),
                                }
                            )

            except IntegrityError:
                # rollback oldu; satır satır fallback
                for row_no, obj, products_str in jobs:
                    try:
                        with transaction.atomic():
                            obj.save()
                        created_ids.append(obj.id)

                        try:
                            if products_str and not _nullish(products_str):
                                _set_customer_products(
                                    obj, products_str, by_user=request.user
                                )
                        except Exception as ex:
                            create_row_errors.append(
                                {
                                    "row": row_no,
                                    "detail": "Products attach failed",
                                    "error": str(ex),
                                    "customer_phone": getattr(
                                        obj, "customer_phone", None
                                    ),
                                }
                            )

                    except IntegrityError as ie:
                        create_row_errors.append(
                            {
                                "row": row_no,
                                "detail": "IntegrityError (muhtemelen unique/constraint)",
                                "error": str(ie),
                                "customer_phone": getattr(obj, "customer_phone", None),
                            }
                        )
                    except Exception as ex:
                        create_row_errors.append(
                            {
                                "row": row_no,
                                "detail": "Create failed",
                                "error": str(ex),
                                "customer_phone": getattr(obj, "customer_phone", None),
                            }
                        )

        return Response(
            {
                **counts,
                "created": len(created_ids),
                "created_ids": created_ids,
                "create_row_errors": create_row_errors,
                "duplicates": duplicates,
                "row_errors": errors,
            },
            status=status.HTTP_200_OK,
        )


# -------------------------
# ✅ BULK UPSERT (Admin Only)
# -------------------------
class CustomerBulkItemSerializer(serializers.Serializer):
    row = serializers.IntegerField(required=False)
    existing_customer_id = serializers.IntegerField(required=False, allow_null=True)

    customer_name = serializers.CharField(required=True)
    customer_surname = serializers.CharField(required=True)
    customer_phone = serializers.CharField(required=True)

    customer_email = serializers.EmailField(
        required=False, allow_null=True, allow_blank=True
    )
    assigned_to = serializers.IntegerField(required=False, allow_null=True)
    tag = serializers.IntegerField(required=False, allow_null=True)
    note = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    # ✅ optional extras
    city = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    products = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    status = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class CustomerBulkUpsertSerializer(serializers.Serializer):
    items = CustomerBulkItemSerializer(many=True)


class CustomerBulkUpsertView(APIView):
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        ser = CustomerBulkUpsertSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        items = ser.validated_data["items"]
        user = request.user

        # phone normalize ( + varsa koru )
        for it in items:
            it["customer_phone"] = _normalize_phone(it.get("customer_phone"))

        ids = [
            it.get("existing_customer_id")
            for it in items
            if it.get("existing_customer_id")
        ]
        existing_by_id = {
            c.id: c for c in Customer.objects.select_for_update().filter(id__in=ids)
        }

        tag_ids = {it.get("tag") for it in items if it.get("tag")}
        tags_map = Tag.objects.in_bulk(tag_ids) if tag_ids else {}

        assigned_ids = {it.get("assigned_to") for it in items if it.get("assigned_to")}
        users_map = User.objects.in_bulk(assigned_ids) if assigned_ids else {}

        to_create = []
        to_update = []  # (customer, tag_obj, assignee, note_text, products_str)
        create_jobs = []  # (phone, tag_obj, assignee, note_text, products_str)

        errors = []

        for it in items:
            row = it.get("row")
            existing_id = it.get("existing_customer_id")

            tag_obj = tags_map.get(it.get("tag")) if it.get("tag") else None
            assignee = (
                users_map.get(it.get("assigned_to")) if it.get("assigned_to") else None
            )
            note_text = it.get("note")
            products_str = it.get("products")

            # UPDATE
            if existing_id:
                customer = existing_by_id.get(existing_id)
                if not customer:
                    errors.append(
                        {
                            "row": row,
                            "existing_customer_id": existing_id,
                            "detail": "Customer not found",
                        }
                    )
                    continue

                if "assigned_to" in CUSTOMER_FIELDS:
                    customer.assigned_to = assignee

                if "customer_email" in CUSTOMER_FIELDS and "customer_email" in it:
                    email = it.get("customer_email")
                    customer.customer_email = email
                    if "email_normalized" in CUSTOMER_FIELDS:
                        customer.email_normalized = (email or "").lower()

                if "city" in CUSTOMER_FIELDS and "city" in it:
                    city = (it.get("city") or "").strip()
                    if city:
                        customer.city = city

                if "status" in CUSTOMER_FIELDS and "status" in it:
                    stv = (it.get("status") or "").strip()
                    if stv:
                        customer.status = stv

                if (
                    "is_active" in CUSTOMER_FIELDS
                    and getattr(customer, "is_active", True) is False
                ):
                    customer.is_active = True

                customer.updated_by = user
                to_update.append((customer, tag_obj, assignee, note_text, products_str))
                continue

            # CREATE
            try:
                phone = it.get("customer_phone")
                if _nullish(phone):
                    errors.append({"row": row, "detail": "customer_phone is invalid"})
                    continue

                email = it.get("customer_email")
                city = (it.get("city") or "").strip()

                c = Customer(
                    customer_name=it["customer_name"],
                    customer_surname=it["customer_surname"],
                    customer_phone=phone,
                    created_by=user,
                    updated_by=user,
                )
                if "customer_email" in CUSTOMER_FIELDS:
                    c.customer_email = email
                if "email_normalized" in CUSTOMER_FIELDS:
                    c.email_normalized = (email or "").lower()
                if "assigned_to" in CUSTOMER_FIELDS:
                    c.assigned_to = assignee
                if "is_active" in CUSTOMER_FIELDS:
                    c.is_active = True
                if "city" in CUSTOMER_FIELDS and city:
                    c.city = city
                if "status" in CUSTOMER_FIELDS:
                    c.status = it.get("status") or "active"
                if "source" in CUSTOMER_FIELDS and _nullish(getattr(c, "source", None)):
                    c.source = "excel"

                to_create.append(c)
                create_jobs.append(
                    (c.customer_phone, tag_obj, assignee, note_text, products_str)
                )
            except Exception as e:
                errors.append({"row": row, "detail": str(e)})

        # bulk create
        created_count = 0
        if to_create:
            Customer.objects.bulk_create(to_create, batch_size=500)
            created_count = len(to_create)

        # bulk update
        updated_count = 0
        if to_update:
            customers_only = [x[0] for x in to_update]
            fields = ["updated_by"]
            for f in [
                "assigned_to",
                "customer_email",
                "email_normalized",
                "is_active",
                "city",
                "status",
            ]:
                if f in CUSTOMER_FIELDS:
                    fields.append(f)
            Customer.objects.bulk_update(customers_only, fields=fields, batch_size=500)
            updated_count = len(customers_only)

        # tag + note + products (history için tek tek)
        tag_updated_count = 0
        note_created_count = 0
        products_updated_count = 0

        for customer, tag_obj, assignee, note_text, products_str in to_update:
            if tag_obj is not None and hasattr(customer, "set_current_tag"):
                customer.set_current_tag(
                    tag_obj, by=user, assign_to=assignee or customer.assigned_to or user
                )
                tag_updated_count += 1

            if note_text and not _nullish(note_text):
                payload = {"customer": customer.id, "note": str(note_text)}
                ns = NotesSerializer(data=payload, context={"request": request})
                ns.is_valid(raise_exception=True)
                ns.save()
                note_created_count += 1

            if products_str and not _nullish(products_str):
                try:
                    _set_customer_products(customer, products_str, by_user=user)
                    products_updated_count += 1
                except Exception as ex:
                    errors.append(
                        {
                            "row": None,
                            "existing_customer_id": customer.id,
                            "detail": f"products failed: {ex}",
                        }
                    )

        if create_jobs:
            phones = [p for (p, _, _, _, _) in create_jobs]
            all_cands = set()
            for p in phones:
                all_cands |= _phone_candidates(p)

            created_map = {
                c.customer_phone: c
                for c in Customer.objects.filter(customer_phone__in=list(all_cands))
            }

            for phone, tag_obj, assignee, note_text, products_str in create_jobs:
                customer = (
                    created_map.get(phone)
                    or created_map.get(phone.lstrip("+"))
                    or created_map.get("+" + phone.lstrip("+"))
                )
                if not customer:
                    continue

                if tag_obj is not None and hasattr(customer, "set_current_tag"):
                    customer.set_current_tag(
                        tag_obj,
                        by=user,
                        assign_to=assignee or customer.assigned_to or user,
                    )
                    tag_updated_count += 1

                if note_text and not _nullish(note_text):
                    payload = {"customer": customer.id, "note": str(note_text)}
                    ns = NotesSerializer(data=payload, context={"request": request})
                    ns.is_valid(raise_exception=True)
                    ns.save()
                    note_created_count += 1

                if products_str and not _nullish(products_str):
                    try:
                        _set_customer_products(customer, products_str, by_user=user)
                        products_updated_count += 1
                    except Exception as ex:
                        errors.append(
                            {
                                "row": None,
                                "existing_customer_id": customer.id,
                                "detail": f"products failed: {ex}",
                            }
                        )

        return Response(
            {
                "created_count": created_count,
                "updated_count": updated_count,
                "tag_updated_count": tag_updated_count,
                "note_created_count": note_created_count,
                "products_updated_count": products_updated_count,
                "errors": errors,
            },
            status=status.HTTP_201_CREATED,
        )


# -------------------------
# Customer ViewSets
# -------------------------
class AdminCustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by("-created_at")
    authentication_classes = [CustomAuthentication]
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    pagination_class = CustomPagination

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = CustomerFilter

    search_fields = [
        "customer_name",
        "customer_surname",
        "customer_email",
        "customer_phone",
    ]
    ordering_fields = ["created_at", "updated_at", "customer_name"]
    ordering = ["customer_name"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        customer = self.get_object()
        user = request.user

        data = request.data.copy()

        tag_value = data.pop("tag", None)
        assigned_value = data.pop("assigned_to", None)
        note_text = data.pop("note", None)

        # ✅ NEW: products string (örn: "erken boşalma, sertleşme")
        products_value = data.pop("products", None)

        if data:
            serializer = self.get_serializer(customer, data=data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            customer = serializer.instance

        new_assignee = getattr(customer, "assigned_to", None)
        if assigned_value is not None and "assigned_to" in CUSTOMER_FIELDS:
            if _nullish(assigned_value):
                new_assignee = None
            else:
                try:
                    new_assignee = User.objects.get(pk=int(assigned_value))
                except (User.DoesNotExist, ValueError, TypeError):
                    raise NotFound("Assigned user not found.")

            customer.assigned_to = new_assignee
            customer.updated_by = user
            update_fields = ["assigned_to", "updated_by"]
            if "updated_at" in CUSTOMER_FIELDS:
                update_fields.append("updated_at")
            customer.save(update_fields=update_fields)

        if tag_value is not None:
            if _nullish(tag_value) or str(tag_value).strip() == "-":
                new_tag = None
            else:
                try:
                    new_tag = Tag.objects.get(pk=int(tag_value))
                except (Tag.DoesNotExist, ValueError, TypeError):
                    raise NotFound("Tag not found.")

            if hasattr(customer, "set_current_tag"):
                customer.set_current_tag(
                    new_tag, by=user, assign_to=new_assignee or user
                )
            elif "tag" in CUSTOMER_FIELDS:
                customer.tag = new_tag
                customer.updated_by = user
                customer.save(update_fields=["tag", "updated_by"])

        if note_text is not None and not _nullish(note_text):
            payload = {"customer": customer.id, "note": str(note_text)}
            ns = NotesSerializer(data=payload, context={"request": request})
            ns.is_valid(raise_exception=True)
            ns.save()

        # ✅ NEW: products set (string -> CustomerProduct)
        if products_value is not None and not _nullish(products_value):
            try:
                _set_customer_products(customer, str(products_value), by_user=user)
            except Exception as ex:
                raise ValidationError({"products": [f"Products update failed: {ex}"]})

        return Response(self.get_serializer(customer).data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        customer = self.get_object()

        if "is_active" not in CUSTOMER_FIELDS:
            raise ValidationError(
                {
                    "detail": "Customer modelinde is_active alanı yok. Soft delete için gerekli."
                }
            )

        customer.is_active = False
        customer.updated_by = request.user

        update_fields = ["is_active", "updated_by"]
        if "updated_at" in CUSTOMER_FIELDS:
            update_fields.append("updated_at")

        customer.save(update_fields=update_fields)
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserCustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by("-created_at")
    authentication_classes = [CustomAuthentication]
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = CustomerFilter

    search_fields = [
        "customer_name",
        "customer_surname",
        "customer_email",
        "customer_phone",
    ]
    ordering_fields = [
        "customer_name",
        "customer_surname",
        "customer_email",
        "created_at",
        "updated_at",
        "status",
        "source",
    ]
    ordering = ["customer_name"]

    def get_queryset(self):
        if self.request.user.is_staff or self.request.user.is_superuser:
            return Customer.objects.all().order_by("-created_at")
        qs = super().get_queryset()
        if "is_active" in CUSTOMER_FIELDS:
            qs = qs.filter(is_active=True)
        return qs.filter(assigned_to=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        customer = self.get_object()
        user = request.user
        is_admin_or_assigned_to_user(request, customer, user)

        incoming_fields = set(request.data.keys())
        if not incoming_fields:
            raise ValidationError({"non_field_errors": ["No data provided."]})

        # User tarafında sadece tag + note
        allowed_fields = {"tag", "note"}
        if not incoming_fields.issubset(allowed_fields):
            raise ValidationError(
                {"non_field_errors": ["Only the tag and note fields can be updated."]}
            )

        if "tag" in request.data:
            tag_value = request.data.get("tag")
            if _nullish(tag_value) or str(tag_value).strip() == "-":
                new_tag = None
            else:
                try:
                    new_tag = Tag.objects.get(pk=int(tag_value))
                except (Tag.DoesNotExist, ValueError, TypeError):
                    raise NotFound("Tag not found.")

            if hasattr(customer, "set_current_tag"):
                customer.set_current_tag(
                    new_tag,
                    by=user,
                    assign_to=getattr(customer, "assigned_to", None) or user,
                )
            elif "tag" in CUSTOMER_FIELDS:
                customer.tag = new_tag
                customer.updated_by = user
                customer.save(update_fields=["tag", "updated_by"])

        if "note" in request.data:
            note_text = request.data.get("note")
            if _nullish(note_text):
                raise ValidationError({"note": ["Note text is required."]})

            payload = {"customer": customer.id, "note": str(note_text)}
            ns = NotesSerializer(data=payload, context={"request": request})
            ns.is_valid(raise_exception=True)
            ns.save()

        return Response(self.get_serializer(customer).data, status=status.HTTP_200_OK)


# -------------------------
# Tag / History / Notes
# -------------------------
class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all().order_by("id")
    serializer_class = TagSerializer
    authentication_classes = [CustomAuthentication]
    lookup_field = "pk"

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminUser()]

    def perform_create(self, serializer):
        extra = {}
        if "created_by" in serializer.fields:
            extra["created_by"] = self.request.user
        if "updated_by" in serializer.fields:
            extra["updated_by"] = self.request.user
        serializer.save(**extra)

    def create(self, request, *args, **kwargs):
        raw = (
            request.data.get("id")
            or request.data.get("pk")
            or request.data.get("name")
            or request.data.get("tag")
            or request.data.get("label")
            or request.data.get("title")
        )

        if _nullish(raw) or str(raw).strip() == "-":
            raise ValidationError({"name": ["Tag name is required."]})

        raw_str = str(raw).strip()

        if raw_str.isdigit():
            tag_obj = Tag.objects.filter(pk=int(raw_str)).first()
            if tag_obj:
                return Response(
                    self.get_serializer(tag_obj).data, status=status.HTTP_200_OK
                )

        name = raw_str
        existing = Tag.objects.filter(name__iexact=name).first()
        if existing:
            return Response(
                self.get_serializer(existing).data, status=status.HTTP_200_OK
            )

        payload = request.data.copy()
        payload["name"] = name

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)

        try:
            self.perform_create(serializer)
        except IntegrityError:
            existing = Tag.objects.filter(name__iexact=name).first()
            if existing:
                return Response(
                    self.get_serializer(existing).data, status=status.HTTP_200_OK
                )
            raise

        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )


class CustomerTagHistoryViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerTagHistorySerializer
    authentication_classes = [CustomAuthentication]
    lookup_field = "pk"
    filter_backends = (
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    )
    filterset_class = TagHistoryFilter

    ordering_fields = ["changed_at", "customer_id"]
    ordering = ["changed_at"]

    def get_permissions(self):
        if self.action in {"list"}:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminUser()]

    def get_queryset(self):
        base_qs = CustomerTagHistory.objects.select_related(
            "customer", "from_tag", "to_tag"
        )
        user = getattr(self.request, "user", None)
        if user and (user.is_staff or user.is_superuser):
            return base_qs.order_by("-changed_at")
        return base_qs.filter(customer__assigned_to=user).order_by("-changed_at")


class NotesViewSet(viewsets.ModelViewSet):
    queryset = Notes.objects.all().order_by("customer", "created_at")
    serializer_class = NotesSerializer
    authentication_classes = [CustomAuthentication]
    lookup_field = "pk"
    filter_backends = (
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    )
    filterset_class = NoteHistoryFilter

    search_fields = ["id", "note"]
    ordering_fields = ["created_at"]
    ordering = ["created_at"]

    def get_permissions(self):
        if self.action in {"list", "create", "retrieve"}:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminUser()]

    def get_queryset(self):
        base_qs = Notes.objects.select_related("customer", "created_by", "updated_by")
        user = getattr(self.request, "user", None)
        if not user or not user.is_authenticated:
            return base_qs.none()
        if user.is_staff or user.is_superuser:
            return base_qs.order_by("customer", "-created_at")
        return base_qs.filter(customer__assigned_to=user)

    def perform_create(self, serializer):
        customer = serializer.validated_data["customer"]
        is_admin_or_assigned_to_user(self.request, customer, self.request.user)
        serializer.save()

    def retrieve(self, request, *args, **kwargs):
        note = self.get_object()
        customer = note.customer
        is_admin_or_assigned_to_user(request, customer, request.user)
        serializer = self.get_serializer(note)
        return Response(serializer.data, status=status.HTTP_200_OK)
