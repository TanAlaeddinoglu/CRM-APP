from datetime import timedelta
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import CustomUser
from customer.models import Customer, CustomerTagHistory, Tag
from events.models import Appointment, AppointmentPayment
from products.models import Product


class ReportEndpointTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_user = CustomUser.objects.create_user(
            username="admin_reports",
            password="testpass123",
            role=CustomUser.Role.ADMIN,
        )
        cls.normal_user = CustomUser.objects.create_user(
            username="normal_reports",
            password="testpass123",
            role=CustomUser.Role.USER,
        )
        cls.sales_user = CustomUser.objects.create_user(
            username="sales_user",
            password="testpass123",
            first_name="Sales",
            last_name="User",
            role=CustomUser.Role.USER,
        )
        cls.other_user = CustomUser.objects.create_user(
            username="other_user",
            password="testpass123",
            first_name="Other",
            last_name="User",
            role=CustomUser.Role.USER,
        )

        cls.tag_hot = Tag.objects.create(
            tag_name="Hot Lead",
            slug="hot-lead",
            color="#FF0000",
            description="Hot tag",
        )
        cls.tag_warm = Tag.objects.create(
            tag_name="Warm Lead",
            slug="warm-lead",
            color="#008000",
            description="Warm tag",
        )

        cls.product_a = Product.objects.create(
            name="Sertlesme",
            description="A product",
            created_by=cls.admin_user,
        )
        cls.product_b = Product.objects.create(
            name="Kalinlastirma",
            description="B product",
            created_by=cls.admin_user,
        )

        cls.customer_1 = Customer.objects.create(
            customer_name="Ali",
            customer_surname="Yilmaz",
            customer_email="ali@example.com",
            customer_phone="5551111111",
            assigned_to=cls.sales_user,
            tag=cls.tag_hot,
            status="active",
            created_by=cls.admin_user,
        )
        cls.customer_2 = Customer.objects.create(
            customer_name="Ayse",
            customer_surname="Demir",
            customer_email="ayse@example.com",
            customer_phone="5552222222",
            assigned_to=cls.sales_user,
            tag=cls.tag_warm,
            status="active",
            created_by=cls.admin_user,
        )
        cls.customer_3 = Customer.objects.create(
            customer_name="Veli",
            customer_surname="Kaya",
            customer_email="veli@example.com",
            customer_phone="5553333333",
            assigned_to=cls.other_user,
            tag=cls.tag_hot,
            status="active",
            created_by=cls.admin_user,
        )

        CustomerTagHistory.objects.create(
            customer=cls.customer_1,
            from_tag=None,
            to_tag=cls.tag_hot,
            changed_by=cls.admin_user,
        )
        CustomerTagHistory.objects.create(
            customer=cls.customer_2,
            from_tag=None,
            to_tag=cls.tag_warm,
            changed_by=cls.admin_user,
        )

        now = timezone.now()

        cls.appointment_1 = Appointment.objects.create(
            name="Appointment 1",
            scheduled_for=now + timedelta(days=1),
            appointment_type="tedavi",
            customer=cls.customer_1,
            product=cls.product_a,
            status="satis",
            created_by=cls.admin_user,
        )
        cls.appointment_2 = Appointment.objects.create(
            name="Appointment 2",
            scheduled_for=now + timedelta(days=2),
            appointment_type="tedavi",
            customer=cls.customer_2,
            product=cls.product_b,
            status="beklemede",
            created_by=cls.admin_user,
        )
        cls.appointment_3 = Appointment.objects.create(
            name="Appointment 3",
            scheduled_for=now + timedelta(days=3),
            appointment_type="tedavi",
            customer=cls.customer_3,
            product=cls.product_a,
            status="olumsuz",
            created_by=cls.admin_user,
        )
        cls.appointment_4 = Appointment.objects.create(
            name="Appointment 4",
            scheduled_for=now + timedelta(days=4),
            appointment_type="tedavi",
            customer=cls.customer_2,
            product=cls.product_a,
            status="satis",
            created_by=cls.admin_user,
        )

        AppointmentPayment.objects.create(
            appointment=cls.appointment_1,
            total_amount=Decimal("300.00"),
            payment_date=now - timedelta(days=1),
            paid_amount=Decimal("100.00"),
            remaining_amount=Decimal("200.00"),
            payment_status="kismi",
            created_by=cls.admin_user,
        )
        AppointmentPayment.objects.create(
            appointment=cls.appointment_1,
            total_amount=Decimal("300.00"),
            payment_date=now,
            paid_amount=Decimal("200.00"),
            remaining_amount=Decimal("0.00"),
            payment_status="tamamlandi",
            created_by=cls.admin_user,
        )
        AppointmentPayment.objects.create(
            appointment=cls.appointment_4,
            total_amount=Decimal("150.00"),
            payment_date=now,
            paid_amount=Decimal("50.00"),
            remaining_amount=Decimal("100.00"),
            payment_status="iptal",
            created_by=cls.admin_user,
        )

    def test_reports_require_authentication(self):
        url = reverse("appointments-summary")
        response = self.client.get(url)
        self.assertIn(response.status_code, {401, 403})

    def test_reports_require_admin(self):
        self.client.force_authenticate(user=self.normal_user)
        url = reverse("appointments-summary")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 403)

    def test_user_dashboard_summary_requires_user_filter(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("user-dashboard-summary")
        response = self.client.get(url, {"preset": "7"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("user_id", response.data)

    def test_user_dashboard_summary_returns_expected_data(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("user-dashboard-summary")
        response = self.client.get(
            url,
            {
                "user_id": self.sales_user.id,
                "preset": "7",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["target_user"]["id"], self.sales_user.id)
        self.assertEqual(response.data["summary"]["active_customer_count"], 2)
        self.assertEqual(response.data["summary"]["tag_change_count"], 2)
        self.assertEqual(response.data["summary"]["total_appointments"], 3)
        self.assertEqual(response.data["summary"]["pending_appointments"], 1)
        self.assertEqual(response.data["summary"]["sales_appointments"], 2)
        self.assertEqual(response.data["summary"]["negative_appointments"], 0)
        self.assertEqual(response.data["summary"]["conversion_rate"], 66.67)
        self.assertEqual(response.data["summary"]["rejection_rate"], 0.0)
        self.assertEqual(
            response.data["summary"]["top_product"]["product_name"], "Sertlesme"
        )

    def test_appointments_summary_can_filter_by_user_and_product(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("appointments-summary")
        response = self.client.get(
            url,
            {
                "user_id": self.sales_user.id,
                "product_id": self.product_a.id,
                "preset": "7",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["total_appointments"], 2)
        self.assertEqual(response.data["summary"]["sales_appointments"], 2)
        self.assertEqual(response.data["summary"]["pending_appointments"], 0)
        self.assertEqual(response.data["summary"]["negative_appointments"], 0)
        self.assertEqual(response.data["summary"]["sales_rate"], 100.0)
        self.assertEqual(len(response.data["tables"]["product_breakdown"]), 1)

    def test_payment_summary_is_appointment_based(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("payment-summary")
        response = self.client.get(url, {"preset": "7"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["total_sales_appointments"], 2)
        self.assertEqual(response.data["summary"]["total_payment_rows"], 3)
        self.assertEqual(response.data["summary"]["completed_appointments"], 1)
        self.assertEqual(response.data["summary"]["partial_appointments"], 0)
        self.assertEqual(response.data["summary"]["cancelled_appointments"], 1)
        self.assertEqual(response.data["summary"]["completed_rate"], 50.0)
        self.assertEqual(response.data["summary"]["cancelled_rate"], 50.0)
        self.assertEqual(response.data["summary"]["total_paid_amount"], 350.0)
        self.assertEqual(response.data["summary"]["completed_paid_amount"], 300.0)
        self.assertEqual(response.data["summary"]["cancelled_paid_amount"], 50.0)
