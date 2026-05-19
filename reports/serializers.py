from rest_framework import serializers

from accounts.models import CustomUser
from products.models import Product
from reports.constants import (
    DEFAULT_REPORT_PRESET,
    MAX_REPORT_RANGE_DAYS,
    REPORT_PRESET_VALUES,
)


class BaseReportQuerySerializer(serializers.Serializer):
    preset = serializers.ChoiceField(
        choices=REPORT_PRESET_VALUES,
        required=False,
        default=DEFAULT_REPORT_PRESET,
    )
    date_from = serializers.DateField(
        required=False,
        input_formats=["%Y-%m-%d"],
    )
    date_to = serializers.DateField(
        required=False,
        input_formats=["%Y-%m-%d"],
    )

    def validate(self, attrs):
        date_from = attrs.get("date_from")
        date_to = attrs.get("date_to")

        if date_from or date_to:
            if not date_from or not date_to:
                raise serializers.ValidationError(
                    {"date_range": ["date_from ve date_to birlikte gönderilmelidir."]}
                )

            if date_from > date_to:
                raise serializers.ValidationError(
                    {"date_range": ["date_from, date_to'dan büyük olamaz."]}
                )

            if (date_to - date_from).days > MAX_REPORT_RANGE_DAYS:
                raise serializers.ValidationError(
                    {
                        "date_range": [
                            f"Custom tarih aralığı en fazla {MAX_REPORT_RANGE_DAYS} gün olabilir."
                        ]
                    }
                )

            attrs.pop("preset", None)

        return attrs


class UserDashboardSummaryQuerySerializer(BaseReportQuerySerializer):
    user_id = serializers.PrimaryKeyRelatedField(
        source="target_user",
        queryset=CustomUser.objects.filter(is_active=True),
        required=True,
    )


class AppointmentsSummaryQuerySerializer(BaseReportQuerySerializer):
    user_id = serializers.PrimaryKeyRelatedField(
        source="target_user",
        queryset=CustomUser.objects.filter(is_active=True),
        required=False,
    )
    product_id = serializers.PrimaryKeyRelatedField(
        source="target_product",
        queryset=Product.objects.all(),
        required=False,
    )


class PaymentSummaryQuerySerializer(BaseReportQuerySerializer):
    user_id = serializers.PrimaryKeyRelatedField(
        source="target_user",
        queryset=CustomUser.objects.filter(is_active=True),
        required=False,
    )
    product_id = serializers.PrimaryKeyRelatedField(
        source="target_product",
        queryset=Product.objects.all(),
        required=False,
    )