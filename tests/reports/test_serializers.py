from rest_framework.test import APITestCase

from accounts.models import CustomUser
from products.models import Product
from reports.serializers import (
    AppointmentsSummaryQuerySerializer,
    PaymentSummaryQuerySerializer,
    UserDashboardSummaryQuerySerializer,
)


class ReportQuerySerializerTests(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username="report_user",
            password="testpass123",
            role=CustomUser.Role.USER,
        )
        self.product = Product.objects.create(
            name="Sertlesme",
            description="Test product",
            created_by=self.user,
        )

    def test_user_dashboard_requires_user_id(self):
        serializer = UserDashboardSummaryQuerySerializer(data={"preset": "7"})
        self.assertFalse(serializer.is_valid())
        self.assertIn("user_id", serializer.errors)

    def test_date_range_requires_both_fields(self):
        serializer = AppointmentsSummaryQuerySerializer(
            data={"date_from": "2026-04-01"}
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("date_range", serializer.errors)

    def test_invalid_date_range_order(self):
        serializer = PaymentSummaryQuerySerializer(
            data={
                "date_from": "2026-04-10",
                "date_to": "2026-04-01",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("date_range", serializer.errors)

    def test_date_range_cannot_exceed_max_limit(self):
        serializer = AppointmentsSummaryQuerySerializer(
            data={
                "date_from": "2025-01-01",
                "date_to": "2026-02-01",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("date_range", serializer.errors)

    def test_valid_serializer_maps_related_filters(self):
        serializer = AppointmentsSummaryQuerySerializer(
            data={
                "preset": "14",
                "user_id": self.user.id,
                "product_id": self.product.id,
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["preset"], "14")
        self.assertEqual(serializer.validated_data["target_user"], self.user)
        self.assertEqual(serializer.validated_data["target_product"], self.product)
