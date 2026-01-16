from rest_framework import serializers

from accounts.models import CustomUser
from customer.models import Customer, Tag
from customer.serializers import phone_candidates, normalize_customer_phone


def normalize_bulk_phone(value):
    normalized = normalize_customer_phone(value)
    if not normalized:
        raise serializers.ValidationError(
            "Phone number is invalid. Examples: +43..., 0043..., 90..., p:+90..."
        )
    return normalized.lstrip("+")


class CustomerBulkCreateItemSerializer(serializers.ModelSerializer):
    assigned_to = serializers.IntegerField(required=False, allow_null=True)
    tag = serializers.IntegerField(required=False, allow_null=True)

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
        ]

    def validate_customer_phone(self, value):
        return normalize_bulk_phone(value)


class CustomerBulkCreateSerializer(serializers.Serializer):
    items = CustomerBulkCreateItemSerializer(many=True)

    def validate(self, attrs):
        items = attrs.get("items") or []
        if not items:
            raise serializers.ValidationError(
                {"items": ["Items list cannot be empty."]}
            )

        # 1) Phone required + payload duplicate check
        phone_to_indexes = {}
        for i, it in enumerate(items):
            p = it.get("customer_phone")
            if not p:
                raise serializers.ValidationError(
                    {
                        "customer_phone": [
                            f"Phone number is required for item index {i}."
                        ]
                    }
                )
            phone_to_indexes.setdefault(p, []).append(i)

        dup_payload = {p: idxs for p, idxs in phone_to_indexes.items() if len(idxs) > 1}
        if dup_payload:
            raise serializers.ValidationError(
                {"customer_phone": [f"Duplicate phone in payload: {dup_payload}"]}
            )

        # 2) DB duplicate control (candidates)
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
                conflicts = {}
                for i, it in enumerate(items):
                    cand = phone_candidates(it["customer_phone"])
                    if cand & exists:
                        conflicts[i] = {"customer_phone": it["customer_phone"]}
                raise serializers.ValidationError(
                    {"customer_phone": [f"Phone already exists for items: {conflicts}"]}
                )

        # 3) FK validation
        user_ids = {
            it["assigned_to"] for it in items if it.get("assigned_to") is not None
        }
        tag_ids = {it["tag"] for it in items if it.get("tag") is not None}

        if user_ids:
            found = set(
                CustomUser.objects.filter(id__in=user_ids).values_list("id", flat=True)
            )
            missing = sorted(list(user_ids - found))
            if missing:
                raise serializers.ValidationError(
                    {"assigned_to": [f"Invalid user ids: {missing}"]}
                )

        if tag_ids:
            found = set(Tag.objects.filter(id__in=tag_ids).values_list("id", flat=True))
            missing = sorted(list(tag_ids - found))
            if missing:
                raise serializers.ValidationError(
                    {"tag": [f"Invalid tag ids: {missing}"]}
                )

        return attrs


class CustomerBulkUpdateItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()

    # PATCH: sadece gelen alanlar uygulanır
    customer_phone = serializers.CharField(required=False)
    customer_name = serializers.CharField(required=False, allow_blank=True)
    customer_surname = serializers.CharField(required=False, allow_blank=True)
    customer_email = serializers.EmailField(required=False, allow_null=True)

    status = serializers.CharField(required=False)

    assigned_to_id = serializers.IntegerField(required=False, allow_null=True)
    tag_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_customer_phone(self, value):
        return normalize_bulk_phone(value)


class CustomerBulkUpdateSerializer(serializers.Serializer):
    items = CustomerBulkUpdateItemSerializer(many=True)

    def validate(self, attrs):
        items = attrs.get("items") or []
        if not items:
            raise serializers.ValidationError(
                {"items": ["Items list cannot be empty."]}
            )

        # 1) id duplicate kontrol
        ids = [it["id"] for it in items]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError({"id": ["Duplicate ids in payload."]})

        # 2) DB’de var mı?
        existing = set(Customer.objects.filter(id__in=ids).values_list("id", flat=True))
        missing = sorted(list(set(ids) - existing))
        if missing:
            raise serializers.ValidationError(
                {"id": [f"Customers not found: {missing}"]}
            )

        # 3) phone duplicate kontrolleri (sadece phone gönderilen item’lar)
        phone_items = [
            (i, it["customer_phone"])
            for i, it in enumerate(items)
            if "customer_phone" in it
        ]
        if phone_items:
            # payload içi duplicate (normalize olmuş halde)
            pmap = {}
            for i, p in phone_items:
                pmap.setdefault(p, []).append(i)
            dup_payload = {p: idxs for p, idxs in pmap.items() if len(idxs) > 1}
            if dup_payload:
                raise serializers.ValidationError(
                    {"customer_phone": [f"Duplicate phone in payload: {dup_payload}"]}
                )

            # DB duplicate (exclude kendi ids’leri)
            all_candidates = set()
            for _, p in phone_items:
                all_candidates |= phone_candidates(p)

            exists_qs = Customer.objects.filter(
                customer_phone__in=list(all_candidates)
            ).exclude(id__in=ids)
            exists = set(exists_qs.values_list("customer_phone", flat=True))
            if exists:
                conflicts = {}
                for i, it in enumerate(items):
                    if "customer_phone" in it and (
                        phone_candidates(it["customer_phone"]) & exists
                    ):
                        conflicts[i] = {"customer_phone": it["customer_phone"]}
                raise serializers.ValidationError(
                    {"customer_phone": [f"Phone already exists for items: {conflicts}"]}
                )

        # 4) FK doğrulama
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
            found = set(
                CustomUser.objects.filter(id__in=user_ids).values_list("id", flat=True)
            )
            missing = sorted(list(user_ids - found))
            if missing:
                raise serializers.ValidationError(
                    {"assigned_to_id": [f"Invalid user ids: {missing}"]}
                )

        if tag_ids:
            found = set(Tag.objects.filter(id__in=tag_ids).values_list("id", flat=True))
            missing = sorted(list(tag_ids - found))
            if missing:
                raise serializers.ValidationError(
                    {"tag_id": [f"Invalid tag ids: {missing}"]}
                )

        return attrs


class CustomerBulkDeleteSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)
