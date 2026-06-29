from rest_framework import serializers

from accounts.models import CustomUser
from customer.models import Customer, Tag
from customer.helpers import normalize_phone_number
from customer.serializers import phone_candidates


def normalize_bulk_phone(value):
    normalized = normalize_phone_number(value)
    if not normalized:
        import re
        raw_digits = re.sub(r"\D", "", str(value or ""))
        if len(raw_digits) == 10:
            raise serializers.ValidationError("Ülke kodu ile girin. Örnek: 905551234567")
        raise serializers.ValidationError("Geçersiz telefon numarası. Örnek: 905551234567")
    return normalized


# ---------------------------------------------------------------------------
# CREATE
# ---------------------------------------------------------------------------

class CustomerBulkCreateItemSerializer(serializers.ModelSerializer):
    assigned_to = serializers.IntegerField(required=False, allow_null=True)
    tag = serializers.IntegerField(required=False, allow_null=True)
    products = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = Customer
        fields = [
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
        ]
        extra_kwargs = {
            "customer_name": {"required": True},
            "customer_phone": {"required": True},
            "customer_surname": {"required": False, "allow_blank": True},
            "customer_email": {"required": False, "allow_null": True},
            "date_of_birth": {"required": False, "allow_null": True},
            "city": {"required": False, "allow_null": True, "allow_blank": True},
            "status": {"required": False, "allow_null": True, "allow_blank": True},
            "source": {"required": False, "allow_null": True, "allow_blank": True},
        }

    def validate_customer_phone(self, value):
        return normalize_bulk_phone(value)


class CustomerBulkCreateSerializer(serializers.Serializer):
    items = CustomerBulkCreateItemSerializer(many=True)

    def validate(self, attrs):
        items = attrs.get("items") or []
        if not items:
            raise serializers.ValidationError({"items": ["Items list cannot be empty."]})

        # Payload içi telefon duplicate
        phone_to_indexes = {}
        for i, it in enumerate(items):
            p = it.get("customer_phone")
            if not p:
                raise serializers.ValidationError(
                    {"customer_phone": [f"Phone required for item index {i}."]}
                )
            phone_to_indexes.setdefault(p, []).append(i)

        dup = {p: idxs for p, idxs in phone_to_indexes.items() if len(idxs) > 1}
        if dup:
            raise serializers.ValidationError(
                {"customer_phone": [f"Duplicate phone in payload: {dup}"]}
            )

        # DB duplicate
        all_candidates = set()
        for it in items:
            all_candidates |= phone_candidates(it["customer_phone"])

        if all_candidates:
            exists = set(
                Customer.objects.filter(
                    customer_phone__in=list(all_candidates)
                ).values_list("customer_phone", flat=True)
            )
            if exists:
                conflicts = {
                    i: {"customer_phone": it["customer_phone"]}
                    for i, it in enumerate(items)
                    if phone_candidates(it["customer_phone"]) & exists
                }
                raise serializers.ValidationError(
                    {"customer_phone": [f"Phone already exists for items: {conflicts}"]}
                )

        # FK doğrulama
        user_ids = {it["assigned_to"] for it in items if it.get("assigned_to") is not None}
        tag_ids = {it["tag"] for it in items if it.get("tag") is not None}

        if user_ids:
            found = set(CustomUser.objects.filter(id__in=user_ids).values_list("id", flat=True))
            missing = sorted(user_ids - found)
            if missing:
                raise serializers.ValidationError({"assigned_to": [f"Invalid user ids: {missing}"]})

        if tag_ids:
            found = set(Tag.objects.filter(id__in=tag_ids).values_list("id", flat=True))
            missing = sorted(tag_ids - found)
            if missing:
                raise serializers.ValidationError({"tag": [f"Invalid tag ids: {missing}"]})

        return attrs


# ---------------------------------------------------------------------------
# UPDATE
# ---------------------------------------------------------------------------

class CustomerBulkUpdateItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()

    customer_phone = serializers.CharField(required=False)
    customer_name = serializers.CharField(required=False, allow_blank=True)
    customer_surname = serializers.CharField(required=False, allow_blank=True)
    customer_email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)
    city = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    status = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    assigned_to_id = serializers.IntegerField(required=False, allow_null=True)
    tag_id = serializers.IntegerField(required=False, allow_null=True)

    note = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    products = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    def validate_customer_phone(self, value):
        return normalize_bulk_phone(value)


class CustomerBulkUpdateSerializer(serializers.Serializer):
    items = CustomerBulkUpdateItemSerializer(many=True)

    def validate(self, attrs):
        items = attrs.get("items") or []
        if not items:
            raise serializers.ValidationError({"items": ["Items list cannot be empty."]})

        # id duplicate
        ids = [it["id"] for it in items]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError({"id": ["Duplicate ids in payload."]})

        # DB'de varlık
        existing = set(Customer.objects.filter(id__in=ids).values_list("id", flat=True))
        missing = sorted(set(ids) - existing)
        if missing:
            raise serializers.ValidationError({"id": [f"Customers not found: {missing}"]})

        # Telefon duplicate
        phone_items = [(i, it["customer_phone"]) for i, it in enumerate(items) if "customer_phone" in it]
        if phone_items:
            pmap = {}
            for i, p in phone_items:
                pmap.setdefault(p, []).append(i)
            dup = {p: idxs for p, idxs in pmap.items() if len(idxs) > 1}
            if dup:
                raise serializers.ValidationError(
                    {"customer_phone": [f"Duplicate phone in payload: {dup}"]}
                )

            all_candidates = set()
            for _, p in phone_items:
                all_candidates |= phone_candidates(p)

            exists = set(
                Customer.objects.filter(customer_phone__in=list(all_candidates))
                .exclude(id__in=ids)
                .values_list("customer_phone", flat=True)
            )
            if exists:
                conflicts = {
                    i: {"customer_phone": it["customer_phone"]}
                    for i, it in enumerate(items)
                    if "customer_phone" in it and phone_candidates(it["customer_phone"]) & exists
                }
                raise serializers.ValidationError(
                    {"customer_phone": [f"Phone already exists for items: {conflicts}"]}
                )

        # FK doğrulama
        user_ids = {
            it["assigned_to_id"]
            for it in items
            if "assigned_to_id" in it and it.get("assigned_to_id") is not None
        }
        tag_ids = {
            it["tag_id"]
            for it in items
            if "tag_id" in it and it.get("tag_id") is not None
        }

        if user_ids:
            found = set(CustomUser.objects.filter(id__in=user_ids).values_list("id", flat=True))
            missing = sorted(user_ids - found)
            if missing:
                raise serializers.ValidationError({"assigned_to_id": [f"Invalid user ids: {missing}"]})

        if tag_ids:
            found = set(Tag.objects.filter(id__in=tag_ids).values_list("id", flat=True))
            missing = sorted(tag_ids - found)
            if missing:
                raise serializers.ValidationError({"tag_id": [f"Invalid tag ids: {missing}"]})

        return attrs


# ---------------------------------------------------------------------------
# DELETE
# ---------------------------------------------------------------------------

class CustomerBulkDeleteSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)
