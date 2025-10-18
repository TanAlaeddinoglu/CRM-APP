import datetime
from rest_framework import serializers
from django.template.defaultfilters import slugify

from customer.models import Customer, Tag, CustomerTagHistory


# CUSTOMER SERIALIZER VALIDATE: VALIDATES PHONE NUMBER,
# CUSTOMER SERIALIZER CREATE: created_by","updated_by", "is_active" SETS DEFAULT,
# CUSTOMER SERIALIZER UPDATE: CUSTOMER TAG HISTORYE YAZIYOR UPDATE DURUMUNDA
# TAG SERIALIZER VALIDATE : VALIDATE SLUG IS ANY EXIST bunu TAG MODEL SAVE DE YAPIYOR BURAYA BIR BAK
# CUSTOMER MODEL SAVE: CHECK STATUS AND CHANGE "is_active"
# CUSTOMER VIEW LERI BASTAN DUSUNEREK YAZ FONKSIYONLAR CALISIYOR AMA KOSULLAR ONEMLI (PERMISSIONLAR VE UPDATE
# KOSULLARI GIBI)
#


class CustomerSerializer(serializers.ModelSerializer):
    """Serialize customer records including creator metadata."""

    created_by = serializers.PrimaryKeyRelatedField(read_only=True)

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
            "is_active"
        ]

    def validate(self, attrs):
        phone_number = attrs.get("customer_phone")
        is_active = attrs.get("status")
        if not phone_number:
            raise serializers.ValidationError({"customer_phone": ["Phone number is required."]})

        trimmed = str(phone_number).strip()

        if len(trimmed) != 11 or not trimmed.isdigit():
            raise serializers.ValidationError({"customer_phone": ["Phone number must be exactly 11 digits."]})

        queryset = Customer.objects.filter(customer_phone=trimmed)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError({"customer_phone": ["Phone number already exists."]})
        attrs["customer_phone"] = trimmed

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if user and user.is_authenticated:
            validated_data.setdefault("created_by", user)
            validated_data.setdefault("updated_by", user)
        validated_data.setdefault("is_active", True)

        context_tag = self.context.get("tag")
        new_tag = validated_data.pop("tag", None)

        customer = super().create(validated_data)

        tag_to_apply = context_tag if context_tag is not None else new_tag
        if tag_to_apply is not None:
            customer.set_current_tag(tag_to_apply, by=user)

        return customer

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = request.user if request else None

        status_value = validated_data.get("status")
        if status_value is not None:
            validated_data["is_active"] = (status_value == "active")
            validated_data["archived_at"] = None
            if status_value == "archived":
                validated_data["archived_at"] = datetime.datetime.now()


        new_tag = validated_data.pop("tag", serializers.empty)

        if user:
            validated_data["updated_by"] = user

        instance = super().update(instance, validated_data)

        if new_tag is not serializers.empty:
            instance.set_current_tag(new_tag, by=user)

        return instance


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
    class Meta:
        model = CustomerTagHistory
        fields = "__all__"
        read_only_fields = ["changed_at",
                            "changed_by",
                            "customer"]
