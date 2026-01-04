# customer/serializers.py
import re
import pandas as pd

from django.db import transaction, IntegrityError
from rest_framework import serializers


from .models import Customer


def normalize_phone(value):
    """
    - Excel'den gelen değeri stringe çevirir
    - +, boşluk, parantez vs temizler
    - sadece rakam bırakır
    - 10-13 hane kontrolü yapar
    """
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    s = re.sub(r"\D", "", s)  # sadece rakam
    if not (10 <= len(s) <= 13):
        return None
    return s


class CustomerExcelImportSerializer(serializers.Serializer):
    """
    POST multipart/form-data
      - file: xlsx/xls
    Dönen: rapor dict (created, duplicates, errors...)
    """

    file = serializers.FileField()

    # Excel'de beklediğin kolonlar
    COLUMN_MAP = {
        "Ad": "customer_name",
        "Soyad": "customer_surname",
        "Telefon": "customer_phone",
        "Email": "customer_email",
    }
    REQUIRED_COLS = {"customer_name", "customer_surname", "customer_phone"}

    def validate_file(self, f):
        name = (getattr(f, "name", "") or "").lower()
        if not (name.endswith(".xlsx") or name.endswith(".xls")):
            raise serializers.ValidationError(
                "Sadece .xlsx veya .xls dosyası yükleyebilirsin."
            )

        # Excel'i burada okuyup serializer instance'ında tutuyoruz
        try:
            df = pd.read_excel(f)
        except Exception as e:
            raise serializers.ValidationError(f"Excel okunamadı: {str(e)}")

        # Kolonları normalize et
        df = df.rename(columns=self.COLUMN_MAP)

        missing = self.REQUIRED_COLS - set(df.columns)
        if missing:
            raise serializers.ValidationError(f"Eksik kolon(lar): {sorted(missing)}")

        # ileride validate/create içinde kullanacağız
        self._df = df
        return f

    def validate(self, attrs):
        """
        Burada dosyayı parse edip:
        - dosya içi duplicate/invalid
        - name/surname boş
        gibi validasyonları yapıp, create aşamasına hazır listeler üretelim.
        """
        df = getattr(self, "_df", None)
        if df is None:
            raise serializers.ValidationError({"file": "Excel verisi okunamadı."})

        duplicates = []
        errors = []
        seen = {}  # phone -> first_row
        parsed_rows = []  # file-unique ve phone valid satırlar

        for i, row in df.iterrows():
            excel_row_no = int(i) + 2  # 1. satır header varsayımı

            raw_phone = row.get("customer_phone")
            phone = normalize_phone(raw_phone)
            if not phone:
                duplicates.append(
                    {
                        "row": excel_row_no,
                        "customer_phone": raw_phone,
                        "reason": "invalid_phone",
                    }
                )
                continue

            if phone in seen:
                duplicates.append(
                    {
                        "row": excel_row_no,
                        "customer_phone": phone,
                        "reason": "duplicate_in_file",
                        "first_seen_row": seen[phone],
                    }
                )
                continue
            seen[phone] = excel_row_no

            name = str(row.get("customer_name") or "").strip()
            surname = str(row.get("customer_surname") or "").strip()

            email = row.get("customer_email")
            email = (
                str(email).strip() if email is not None and str(email).strip() else None
            )

            # Model alanların blank=False => boşsa hata
            if not name or not surname:
                errors.append(
                    {
                        "row": excel_row_no,
                        "errors": {
                            "customer_name/surname": "Name and surname are required."
                        },
                    }
                )
                continue

            parsed_rows.append(
                {
                    "row": excel_row_no,
                    "customer_phone": phone,
                    "customer_name": name,
                    "customer_surname": surname,
                    "customer_email": email,
                    # bulk_create save() çalıştırmaz => email_normalized'i burada set etmeliyiz
                    "email_normalized": (email or "").strip().lower(),
                }
            )

        # create aşamasına taşınacak veriler
        attrs["_total_rows"] = int(df.shape[0])
        attrs["_phones"] = list(seen.keys())
        attrs["_parsed_rows"] = parsed_rows
        attrs["_duplicates"] = duplicates
        attrs["_errors"] = errors
        return attrs

    def create(self, validated_data):
        """
        Burada DB duplicate kontrol + bulk_create yapıyoruz.
        serializer.save() bunu çağırır.
        """
        request = self.context.get("request")
        user = getattr(request, "user", None)

        total_rows = validated_data["_total_rows"]
        phones = validated_data["_phones"]
        parsed_rows = validated_data["_parsed_rows"]
        duplicates = validated_data["_duplicates"]
        errors = validated_data["_errors"]

        # 1) DB duplicate tek sorgu
        existing_map = dict(
            Customer.objects.filter(customer_phone__in=phones).values_list(
                "customer_phone", "id"
            )
        )

        to_create = []
        for r in parsed_rows:
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

            to_create.append(
                Customer(
                    customer_name=r["customer_name"],
                    customer_surname=r["customer_surname"],
                    customer_phone=r["customer_phone"],
                    customer_email=r["customer_email"],
                    email_normalized=r["email_normalized"],
                    created_by=user,
                    updated_by=user,
                    # tag=None, assigned_to=None => etiketsiz/havuzda
                )
            )

        # 2) Create (transaction)
        try:
            with transaction.atomic():
                created = Customer.objects.bulk_create(to_create, batch_size=500)
        except IntegrityError:
            # Eş zamanlı import çakışması vs
            raise serializers.ValidationError(
                {
                    "detail": "Integrity error (muhtemel eşzamanlı import/duplicate çakışması)."
                }
            )

        # sayımlar
        dup_in_file = sum(
            1 for d in duplicates if d.get("reason") == "duplicate_in_file"
        )
        dup_in_db = sum(1 for d in duplicates if d.get("reason") == "duplicate_in_db")
        invalid_phone = sum(1 for d in duplicates if d.get("reason") == "invalid_phone")

        return {
            "total_rows": total_rows,
            "created": len(created),
            "duplicates_in_file": dup_in_file,
            "duplicates_in_db": dup_in_db,
            "invalid_phone": invalid_phone,
            "created_ids": [c.id for c in created],
            "duplicates": duplicates,
            "errors": errors,
        }


class CustomerExcelRowSerializer(serializers.Serializer):
    customer_name = serializers.CharField(max_length=50)
    customer_surname = serializers.CharField(max_length=50)
    customer_email = serializers.EmailField(
        required=False, allow_null=True, allow_blank=True
    )
    customer_phone = serializers.CharField()

    def validate_customer_name(self, v):
        v = (v or "").strip()
        if not v:
            raise serializers.ValidationError("Name is required.")
        return v

    def validate_customer_surname(self, v):
        v = (v or "").strip()
        if not v:
            raise serializers.ValidationError("Surname is required.")
        return v

    def validate_customer_phone(self, v):
        phone = normalize_phone(v)
        if not phone:
            raise serializers.ValidationError(
                "Phone must be numeric and 10-13 digits (examples: 90123456789, +901234567890)."
            )
        return phone

    def validate_customer_email(self, v):
        if v in ("", None):
            return None
        return str(v).strip().lower()
