from django.utils import timezone
from rest_framework import serializers
from django.template.defaultfilters import slugify
import re

from accounts.models import CustomUser
from customer.models import Customer, Tag, CustomerTagHistory, Notes
from common.utils import DEFAULT_TAG_ID
from customer.services import move_to_customer_pool
from products.serializers import CustomerProductsSerializer


NULLISH = {"", "null", "none", "undefined"}


def normalize_customer_phone(value):
    """
    Ülke kodu tahmini YOK.
    - p:+... -> +...
    - 00...  -> +...
    - + ile geldiyse + korunur
    - + yoksa digits döner
    - 8-15 digit arası kabul
    """
    if value is None:
        return None

    s = str(value).strip()
    if not s or s.lower() in NULLISH:
        return None

    s = s.replace("p:", "").strip()

    # excel numeric
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


def phone_candidates(phone_value: str):
    """
    DB karışık (+905.. / 905..) olduğu için iki varyant üret.
    """
    p = normalize_customer_phone(phone_value)
    if not p:
        return set()
    digits = p.lstrip("+")
    return {digits, "+" + digits}


class CustomerSerializer(serializers.ModelSerializer):
    """Serialize customer records including creator metadata."""

    created_by = serializers.ReadOnlyField(source="created_by.username")
    updated_by = serializers.ReadOnlyField(source="updated_by.username")
    assigned_to = serializers.SerializerMethodField()
    tag = serializers.SerializerMethodField()

    assigned = serializers.PrimaryKeyRelatedField(
        source="assigned_to",
        queryset=CustomUser.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )

    tag_id = serializers.PrimaryKeyRelatedField(
        source="tag",
        queryset=Tag.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )

    products = CustomerProductsSerializer(many=True, read_only=True)

    class Meta:
        model = Customer
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "archived_at",
            "email_normalized",
            "created_by",
            "updated_by",
            "is_active",
        ]

    def get_assigned_to(self, obj):
        return obj.assigned_to.username if obj.assigned_to else None

    def get_tag(self, obj):
        return obj.tag.tag_name if obj.tag else None

    def validate(self, attrs):
        # PATCH'te phone gelmediyse zorlamayalım
        if self.partial and "customer_phone" not in attrs:
            return attrs

        phone_number = attrs.get("customer_phone")
        if not phone_number:
            raise serializers.ValidationError({"customer_phone": ["Phone number is required."]})

        normalized = normalize_customer_phone(phone_number)
        if not normalized:
            raise serializers.ValidationError(
                {"customer_phone": ["Phone number is invalid. Examples: +43..., 0043..., 90..., p:+90..."]}
            )

        cand = phone_candidates(normalized)
        qs = Customer.objects.filter(customer_phone__in=list(cand))
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError({"customer_phone": ["Phone number already exists."]})

        # ✅ + varsa koruyarak kaydet
        attrs["customer_phone"] = normalized
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if user and user.is_authenticated:
            validated_data.setdefault("created_by", user)
            validated_data.setdefault("updated_by", user)

        context_tag = self.context.get("tag")
        new_tag = validated_data.pop("tag", None)

        customer = super().create(validated_data)
        if customer.status == "pool":
            return customer

        tag_to_apply = context_tag if context_tag is not None else new_tag
        if tag_to_apply is not None:
            assignee = customer.assigned_to or user
            customer.set_current_tag(tag_to_apply, by=user, assign_to=assignee)

        return customer

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = request.user if request else None

        status_value = validated_data.get("status")
        if status_value is not None:
            validated_data["is_active"] = status_value == "active"
            validated_data["archived_at"] = None
            if status_value == "archived":
                validated_data["archived_at"] = timezone.now()

        old_assigned_to_id = instance.assigned_to_id
        new_tag = validated_data.pop("tag", serializers.empty)

        if user:
            validated_data["updated_by"] = user

        # Prevent assigning a user without providing a tag.
        if (
            "assigned_to" in validated_data
            and validated_data.get("assigned_to") is not None
            and (
                (new_tag is serializers.empty and instance.tag_id is None)
                or new_tag is None
            )
        ):
            raise serializers.ValidationError({"tag": ["you need to set the tag"]})

        instance = super().update(instance, validated_data)

        if new_tag is not serializers.empty:
            instance.set_current_tag(
                new_tag, by=user, assign_to=instance.assigned_to or user
            )
        else:
            assigned_now = (
                old_assigned_to_id is None and instance.assigned_to_id is not None
            )
            if assigned_now and instance.tag_id is None:
                default_tag = self._get_default_tag()
                if default_tag is not None:
                    instance.set_current_tag(
                        default_tag, by=user, assign_to=instance.assigned_to or user
                    )

        # If both tag and assignee are set, ensure status is active.
        if instance.assigned_to_id is not None and instance.tag_id is not None:
            update_fields = ["status", "updated_at"]
            instance.status = "active"
            if user is not None:
                instance.updated_by = user
                update_fields.append("updated_by")
            instance.save(update_fields=update_fields)

        # Enforce: if tag or assignee is null after update, clear both and move to pool
        if instance.assigned_to_id is None or instance.tag_id is None:
            move_to_customer_pool(instance, by=user)

        return instance

    @staticmethod
    def _get_default_tag():
        if not DEFAULT_TAG_ID:
            return None
        try:
            return Tag.objects.get(pk=DEFAULT_TAG_ID)
        except Tag.DoesNotExist:
            return None


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = "__all__"
        read_only_fields = ["slug"]

    def validate(self, attrs):
        tag_name = attrs.get("tag_name")
        if not tag_name:
            return attrs

        generated_slug = slugify(tag_name)
        queryset = Tag.objects.filter(slug=generated_slug)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError(
                {"tag_name": ["A tag with a similar name already exists."]}
            )

        attrs["slug"] = generated_slug
        return attrs


class CustomerTagHistorySerializer(serializers.ModelSerializer):
    changed_by = serializers.ReadOnlyField(source="changed_by.username")
    from_tag = serializers.SerializerMethodField(method_name="get_from_tag")
    to_tag = serializers.SerializerMethodField()
    customer = serializers.SerializerMethodField()

    class Meta:
        model = CustomerTagHistory
        fields = "__all__"
        read_only_fields = [
            "changed_at",
            "changed_by",
        ]

    def get_from_tag(self, obj):
        return obj.from_tag.tag_name if obj.from_tag else None

    def get_to_tag(self, obj):
        return obj.to_tag.tag_name if obj.to_tag else None

    def get_customer(self, obj):
        return obj.customer.full_name() if obj.customer else None


class NotesSerializer(serializers.ModelSerializer):
    customer = serializers.SerializerMethodField(read_only=True)  # output
    customer_id = serializers.PrimaryKeyRelatedField(
        source="customer", queryset=Customer.objects.all(), write_only=True
    )

    created_by = serializers.ReadOnlyField(source="created_by.username")
    updated_by = serializers.ReadOnlyField(source="updated_by.username")

    class Meta:
        model = Notes
        fields = "__all__"
        read_only_fields = [
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

    def get_customer(self, obj):
        return obj.customer.full_name() if obj.customer else None

    def create(self, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if user and user.is_authenticated:
            validated_data.setdefault("created_by", user)

        return super().create(validated_data)

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if user and user.is_authenticated:
            validated_data["updated_by"] = user

        return super().update(instance, validated_data)
