import pandas as pd
from django.db import transaction
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authenticate import CustomAuthentication
from .bulkSerilaizer import CustomerExcelRowSerializer
from .models import Customer
from products.models import CustomerProduct

EXCEL_COL_MAP = {
    # Excel başlıkların
    "Ad": "customer_name",
    "Soyad": "customer_surname",
    "Telefon": "customer_phone",
    "Email": "customer_email",
    "Tag": "tag",
    "Assigned": "assigned_to",
    "Products": "products",
}


def _read_excel_to_rows(excel_file):
    df = pd.read_excel(excel_file)
    df = df.rename(columns=EXCEL_COL_MAP)

    required_cols = {"customer_name", "customer_surname", "customer_phone"}
    missing = required_cols - set(df.columns)
    if missing:
        return None, {"detail": f"Eksik kolon(lar): {sorted(missing)}"}

    # satır satır dict listesi
    rows = []
    for i, r in df.iterrows():
        excel_row_no = int(i) + 2  # header 1. satır varsayımı
        rows.append(
            {
                "row": excel_row_no,
                "customer_name": r.get("customer_name"),
                "customer_surname": r.get("customer_surname"),
                "customer_phone": r.get("customer_phone"),
                "customer_email": r.get("customer_email"),
                "tag": r.get("tag"),
                "assigned_to": r.get("assigned_to"),
                "products": r.get("products"),
            }
        )
    return rows, None


def _analyze_rows(rows):
    """
    - Row serializer ile validate
    - Dosya içi duplicate (phone)
    - DB duplicate (phone)
    Return: preview_rows, duplicates, errors, counts
    """
    errors = []
    duplicates = []

    # 1) validate + normalize
    validated = []
    for r in rows:
        row_no = r["row"]
        ser = CustomerExcelRowSerializer(data=r)
        if not ser.is_valid():
            errors.append({"row": row_no, "errors": ser.errors})
            continue

        data = ser.validated_data
        validated.append({"row": row_no, **data})

    # 2) duplicate in file
    seen = {}  # phone -> first_row
    file_unique = []
    for r in validated:
        phone = r["customer_phone"]
        if phone in seen:
            duplicates.append(
                {
                    "row": r["row"],
                    "customer_phone": phone,
                    "reason": "duplicate_in_file",
                    "first_seen_row": seen[phone],
                }
            )
            continue
        seen[phone] = r["row"]
        file_unique.append(r)

    # 3) duplicate in db (tek sorgu)
    phones = [r["customer_phone"] for r in file_unique]
    existing_map = dict(
        Customer.objects.filter(customer_phone__in=phones).values_list(
            "customer_phone", "id"
        )
    )

    preview_rows = []
    for r in file_unique:
        phone = r["customer_phone"]
        if phone in existing_map:
            duplicates.append(
                {
                    "row": r["row"],
                    "customer_phone": phone,
                    "reason": "duplicate_in_db",
                    "existing_customer_id": existing_map[phone],
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


class CustomerExcelDryRunView(APIView):
    """
    POST /customers/import-excel/dry-run/
    multipart/form-data:
      file: excel

    DB'ye KAYDETMEZ. Preview + duplicate + errors döner.
    """

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
    """
    POST /customers/import-excel/
    multipart/form-data:
      file: excel

    GERÇEK KAYIT. Yine aynı kontrolleri yapar, sadece preview_rows kadar create eder.
    """

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

        # create
        to_create = []
        for r in preview_rows:
            email = r.get("customer_email") or None
            to_create.append(
                Customer(
                    customer_name=r["customer_name"],
                    customer_surname=r["customer_surname"],
                    customer_phone=r["customer_phone"],
                    customer_email=email,
                    email_normalized=(email or "").lower(),
                    tag_id=r.get("tag"),
                    assigned_to_id=r.get("assigned_to"),
                    created_by=request.user,
                    updated_by=request.user,
                    # tag=None, assigned_to=None
                )
            )

        with transaction.atomic():
            created = Customer.objects.bulk_create(to_create, batch_size=500)
            # products (if any)
            customer_products = []
            for r, cust in zip(preview_rows, created):
                prod_ids = r.get("products") or []
                for pid in prod_ids:
                    customer_products.append(
                        CustomerProduct(
                            customer=cust,
                            product_id=pid,
                            created_by=request.user,
                            updated_by=request.user,
                        )
                    )
            if customer_products:
                CustomerProduct.objects.bulk_create(
                    customer_products, ignore_conflicts=True, batch_size=500
                )

        return Response(
            {
                **counts,
                "created": len(created),
                "created_ids": [c.id for c in created],
                "duplicates": duplicates,
                "row_errors": errors,
            },
            status=status.HTTP_200_OK,
        )
