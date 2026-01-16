# customer/bulkSerilaizer.py
import re
from rest_framework import serializers


def normalize_phone_keep_plus(value):
    """
    - Excel'den gelen değeri stringe çevirir
    - 'p:+905...' gibi prefixleri temizler
    - Sadece baştaki '+' korunur, diğer her şey temizlenir
    - 10-13 hane kontrolü yapar (DB validator ile uyumlu)
    """
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None

    # meta export: "p:+905..." gelebiliyor
    s = re.sub(r"^p:\s*", "", s, flags=re.IGNORECASE).strip()

    has_plus = s.startswith("+")
    digits = re.sub(r"\D", "", s)

    if not (10 <= len(digits) <= 13):
        return None

    return f"+{digits}" if has_plus else digits


class CustomerExcelRowSerializer(serializers.Serializer):
    row = serializers.IntegerField(required=False)

    customer_name = serializers.CharField(max_length=100)
    customer_surname = serializers.CharField(
        max_length=100, required=False, allow_blank=True, allow_null=True
    )

    # email opsiyonel (zaten sende böyle)
    customer_email = serializers.EmailField(
        required=False, allow_null=True, allow_blank=True
    )

    customer_phone = serializers.CharField()

    # ✅ ŞEHİR EKLENDİ (opsiyonel)
    city = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    products = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    def validate_customer_name(self, v):
        v = (v or "").strip()
        if not v:
            raise serializers.ValidationError("Name is required.")
        return v

    def validate_customer_surname(self, v):
        return (v or "").strip()

    def validate_customer_phone(self, v):
        phone = normalize_phone_keep_plus(v)
        if not phone:
            raise serializers.ValidationError(
                "Phone must be numeric and 10-13 digits (examples: 90123456789, +901234567890)."
            )
        return phone

    def validate_customer_email(self, v):
        if v in ("", None):
            return None
        return str(v).strip().lower()

    # ✅ city normalize
    def validate_city(self, v):
        if v in ("", None):
            return None
        return str(v).strip()

    # -------------------------
    # ✅ BULK UPSERT (Admin Only)
    # -------------------------


class CustomerBulkItemSerializer(serializers.Serializer):
    row = serializers.IntegerField(required=False)
    existing_customer_id = serializers.IntegerField(required=False, allow_null=True)

    customer_name = serializers.CharField(required=True)
    customer_surname = serializers.CharField(required=True, allow_blank=True)
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
