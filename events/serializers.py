from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers

from customer.models import Customer
from products.models import Product
from .models import Appointment, AppointmentPayment


# TODO: payment hesaplamasini duzenle delete oldgunuda guncel kalsin
class AppointmentSerializer(serializers.ModelSerializer):
    created_by = serializers.ReadOnlyField(source="created_by.username")
    updated_by = serializers.ReadOnlyField(source="updated_by.username")
    customer = serializers.SerializerMethodField(read_only=True)
    product = serializers.SerializerMethodField(read_only=True)
    customer_id = serializers.PrimaryKeyRelatedField(
        source="customer", queryset=Customer.objects.all(), write_only=True
    )
    product_id = serializers.PrimaryKeyRelatedField(
        source="product", queryset=Product.objects.all(), write_only=True
    )

    class Meta:
        model = Appointment
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

    def get_customer(self, obj):
        return obj.customer.full_name() if obj.customer else None

    def get_product(self, obj):
        return obj.product.name if obj.product else None

    def create(self, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if user and user.is_authenticated:
            validated_data.setdefault("created_by", user)
        appointment = super().create(validated_data)

        return appointment

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            validated_data.setdefault("updated_by", user)
        instance = super().update(instance, validated_data)
        return instance

    def validate(self, attrs):
        """
        Ensure the appointment is scheduled for the future and avoid duplicate bookings.
        """
        scheduled_for = attrs.get("scheduled_for")
        if scheduled_for is None and self.instance is not None:
            scheduled_for = self.instance.scheduled_for

        if scheduled_for is not None:
            aware_scheduled = scheduled_for
            if timezone.is_naive(aware_scheduled):
                aware_scheduled = timezone.make_aware(
                    aware_scheduled,
                    timezone.get_current_timezone(),
                    is_dst=None,
                )

            now = timezone.now()
            if self.instance is not None and self.instance.pk:
                current = self.instance.scheduled_for
                if timezone.is_naive(current):
                    current = timezone.make_aware(
                        current,
                        timezone.get_current_timezone(),
                        is_dst=None,
                    )
                if aware_scheduled <= now and aware_scheduled != current:
                    raise serializers.ValidationError(
                        {
                            "scheduled_for": [
                                "Appointments must be scheduled in the future."
                            ]
                        }
                    )

            elif aware_scheduled <= now:
                raise serializers.ValidationError(
                    {"scheduled_for": ["Appointments must be scheduled in the future."]}
                )
            attrs["scheduled_for"] = aware_scheduled
            scheduled_for = aware_scheduled

        customer = attrs.get("customer") or getattr(self.instance, "customer", None)
        product = attrs.get("product") or getattr(self.instance, "product", None)
        if customer and product and scheduled_for:
            qs = Appointment.objects.filter(
                customer=customer,
                scheduled_for=scheduled_for,
            )
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {
                        "scheduled_for": [
                            "This customer already has an appointment at this time."
                        ]
                    }
                )
        return attrs


class AppointmentPaymentSerializer(serializers.ModelSerializer):
    created_by = serializers.ReadOnlyField(source="created_by.username")
    updated_by = serializers.ReadOnlyField(source="updated_by.username")

    class Meta:
        model = AppointmentPayment
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "remaining_amount",
        ]

    def create(self, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        appointment = validated_data.get("appointment")
        paid_amount = validated_data.get("paid_amount", Decimal("0.00"))

        if user and user.is_authenticated:
            validated_data["created_by"] = user

        # 1️⃣ TOTAL AMOUNT BELİRLE
        total_amount = validated_data.get("total_amount")

        if total_amount is None:
            # Önceki ödemelerden al
            last_payment = (
                AppointmentPayment.objects.filter(appointment=appointment)
                .order_by("-created_at")
                .first()
            )
            if last_payment:
                total_amount = last_payment.total_amount
            else:
                raise serializers.ValidationError(
                    {"total_amount": ["Total amount is required for first payment."]}
                )

        payments_sum = AppointmentPayment.objects.filter(
            appointment=appointment
        ).aggregate(total=Sum("paid_amount")).get("total") or Decimal("0.00")

        total_paid = payments_sum + paid_amount
        remaining_amount = total_amount - total_paid

        if remaining_amount < Decimal("0.00"):
            raise serializers.ValidationError(
                {"paid_amount": ["Total paid amount cannot exceed total amount."]}
            )

        validated_data["total_amount"] = total_amount
        validated_data["remaining_amount"] = remaining_amount

        if remaining_amount == Decimal("0.00"):
            validated_data["payment_status"] = "tamamlandi"

        return super().create(validated_data)

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        validated_data.pop("total_amount", None)  # prevent overwrite
        if user and user.is_authenticated:
            validated_data.setdefault("updated_by", user)
        instance = super().update(instance, validated_data)

        return instance

    def validate(self, attrs):
        """
        remaining_amount cannot bigger than total amount
        paid cannot be bigger than total amount and remaining amount
        """
        total = attrs.get("total_amount")
        paid = attrs.get("paid_amount")
        appointment = attrs.get("appointment") or getattr(
            self.instance, "appointment", None
        )

        if self.instance is not None:
            if total is None:
                total = self.instance.total_amount
            if paid is None:
                paid = self.instance.paid_amount

        errors = {}

        if total is not None and paid is not None and paid > total:
            errors["paid_amount"] = ["Paid amount cannot exceed total amount."]

        if total is not None and total < 0:
            errors["total_amount"] = [
                "Total amount must be greater than or equal to zero."
            ]
        if paid is not None and paid < 0:
            errors.setdefault("paid_amount", []).append(
                "Paid amount must be greater than or equal to zero."
            )
        if appointment is None:
            errors["appointment"] = ["Appointment is required."]

        if errors:
            raise serializers.ValidationError(errors)

        return attrs
