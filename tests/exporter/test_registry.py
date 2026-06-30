from datetime import datetime, timezone

import pytest

from customer.models import Customer, Tag
from events.models import Appointment, AppointmentPayment
from exporter.registry.appointment_payment_registry import AppointmentPaymentExportRegistry
from exporter.registry.appointment_registry import AppointmentExportRegistry
from exporter.registry.base_registry import BaseExportRegistry, ExportRegistry
from exporter.registry.customer_registry import CustomerExportRegistry
from exporter.registry.product_registry import ProductExportRegistry
from exporter.registry.tag_registry import TagExportRegistry
from exporter.registry.user_registry import UserExportRegistry
from products.models import Product

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_customer(*, name, phone, created_by, assigned_to=None):
    return Customer.objects.create(
        customer_name=name,
        customer_surname="Test",
        customer_phone=phone,
        created_by=created_by,
        assigned_to=assigned_to,
    )


def _make_appointment(*, name, customer, product, created_by, scheduled_for=None):
    from django.utils import timezone as tz

    return Appointment.objects.create(
        name=name,
        scheduled_for=scheduled_for or tz.now(),
        appointment_type="muayene",
        customer=customer,
        product=product,
        created_by=created_by,
    )


def _make_payment(*, appointment, created_by, total=100, paid=50):
    from django.utils import timezone as tz
    from decimal import Decimal

    return AppointmentPayment.objects.create(
        appointment=appointment,
        total_amount=Decimal(str(total)),
        payment_date=tz.now(),
        paid_amount=Decimal(str(paid)),
        remaining_amount=Decimal(str(total - paid)),
        created_by=created_by,
    )


# ---------------------------------------------------------------------------
# BaseExportRegistry
# ---------------------------------------------------------------------------

class TestBaseExportRegistry:
    def setup_method(self):
        class SampleRegistry(BaseExportRegistry):
            model_name = "sample"
            default_fields = ["name", "email"]
            field_map = {
                "name": "customer_name",
                "email": "customer_email",
                "tag": "tag.tag_name",
            }

            def get_queryset(self, user):
                return []

        self.registry = SampleRegistry()

    def test_resolve_fields_returns_default_when_none(self):
        fields = self.registry.resolve_fields(None)
        assert fields == ["name", "email"]

    def test_resolve_fields_returns_requested_fields(self):
        fields = self.registry.resolve_fields(["name"])
        assert fields == ["name"]

    def test_resolve_fields_raises_for_invalid_field(self):
        with pytest.raises(ValueError, match="Unsupported fields"):
            self.registry.resolve_fields(["nonexistent"])

    def test_resolve_fields_raises_and_lists_all_invalid(self):
        with pytest.raises(ValueError, match="bad1"):
            self.registry.resolve_fields(["name", "bad1"])

    def test_get_allowed_fields_returns_all_field_map_keys(self):
        allowed = self.registry.get_allowed_fields()
        assert set(allowed) == {"name", "email", "tag"}

    def test_get_field_value_simple_attribute(self, admin_user):
        customer = _make_customer(name="Ahmet", phone="5001112233", created_by=admin_user)
        value = self.registry.get_field_value(customer, "name")
        assert value == "Ahmet"

    def test_get_field_value_nested_dotted_path(self, admin_user):
        tag = Tag.objects.create(tag_name="Premium", color="#FF0000")
        customer = _make_customer(name="Bora", phone="5001112244", created_by=admin_user)
        customer.tag = tag
        customer.save()
        value = self.registry.get_field_value(customer, "tag")
        assert value == "Premium"

    def test_get_field_value_returns_none_when_chain_breaks(self, admin_user):
        customer = _make_customer(name="Canan", phone="5001112255", created_by=admin_user)
        value = self.registry.get_field_value(customer, "tag")
        assert value is None

    def test_build_dataset_structure(self, admin_user):
        class CustomerSampleRegistry(BaseExportRegistry):
            model_name = "sample2"
            default_fields = ["name"]
            field_map = {"name": "customer_name"}

            def get_queryset(self, user):
                return Customer.objects.filter(created_by=user)

        registry = CustomerSampleRegistry()
        _make_customer(name="Derya", phone="5001112266", created_by=admin_user)
        dataset = registry.build_dataset(user=admin_user)

        assert dataset.headers == ["name"]
        assert dataset.fields == ["name"]
        assert len(dataset.rows) == 1
        assert dataset.rows[0] == ["Derya"]


# ---------------------------------------------------------------------------
# ExportRegistry
# ---------------------------------------------------------------------------

class TestExportRegistry:
    def test_get_returns_registered_registry(self):
        registry = ExportRegistry.get("customer")
        assert isinstance(registry, CustomerExportRegistry)

    def test_get_normalizes_model_name(self):
        registry = ExportRegistry.get("  CUSTOMER  ")
        assert isinstance(registry, CustomerExportRegistry)

    def test_get_raises_key_error_for_unknown_model(self):
        with pytest.raises(KeyError):
            ExportRegistry.get("nonexistent_model_xyz")

    def test_clear_removes_all_registries(self):
        original = dict(ExportRegistry._registries)
        try:
            ExportRegistry.clear()
            with pytest.raises(KeyError):
                ExportRegistry.get("customer")
        finally:
            ExportRegistry._registries = original


# ---------------------------------------------------------------------------
# CustomerExportRegistry
# ---------------------------------------------------------------------------

class TestCustomerExportRegistry:
    def test_admin_gets_all_customers(self, admin_user, regular_user):
        _make_customer(name="Alpha", phone="5001110001", created_by=admin_user, assigned_to=admin_user)
        _make_customer(name="Beta", phone="5001110002", created_by=admin_user, assigned_to=regular_user)

        registry = CustomerExportRegistry()
        qs = list(registry.get_queryset(admin_user))
        assert len(qs) == 2

    def test_regular_user_only_gets_assigned_customers(self, admin_user, regular_user):
        _make_customer(name="Mine", phone="5001110003", created_by=admin_user, assigned_to=regular_user)
        _make_customer(name="NotMine", phone="5001110004", created_by=admin_user, assigned_to=admin_user)

        registry = CustomerExportRegistry()
        qs = list(registry.get_queryset(regular_user))
        assert len(qs) == 1
        assert qs[0].customer_name == "Mine"

    def test_queryset_is_ordered_by_name_ascending(self, admin_user):
        _make_customer(name="Zeta", phone="5001110005", created_by=admin_user, assigned_to=admin_user)
        _make_customer(name="Alpha", phone="5001110006", created_by=admin_user, assigned_to=admin_user)

        registry = CustomerExportRegistry()
        names = [c.customer_name for c in registry.get_queryset(admin_user)]
        assert names == sorted(names)

    def test_default_fields_are_populated(self):
        registry = CustomerExportRegistry()
        assert "customer_name" in registry.default_fields
        assert "assigned_to" in registry.default_fields


# ---------------------------------------------------------------------------
# AppointmentExportRegistry
# ---------------------------------------------------------------------------

class TestAppointmentExportRegistry:
    def test_get_queryset_returns_all_appointments(self, admin_user):
        from django.utils import timezone as tz

        customer = _make_customer(name="Ece", phone="5001110010", created_by=admin_user)
        product = Product.objects.create(name="Lazer Tedavi", created_by=admin_user)
        _make_appointment(name="Randevu1", customer=customer, product=product, created_by=admin_user)

        registry = AppointmentExportRegistry()
        assert registry.get_queryset(admin_user).count() == 1

    def test_get_field_value_customer_full_name(self, admin_user):
        customer = _make_customer(name="Ece", phone="5001110011", created_by=admin_user)
        product = Product.objects.create(name="Botoks", created_by=admin_user)
        appt = _make_appointment(name="R2", customer=customer, product=product, created_by=admin_user)

        registry = AppointmentExportRegistry()
        value = registry.get_field_value(appt, "customer")
        assert value == customer.full_name()

    def test_model_name_is_events(self):
        assert AppointmentExportRegistry.model_name == "events"


# ---------------------------------------------------------------------------
# ProductExportRegistry
# ---------------------------------------------------------------------------

class TestProductExportRegistry:
    def test_get_queryset_returns_products_ordered_by_name(self, admin_user):
        Product.objects.create(name="Zeytinyağı Masaj", created_by=admin_user)
        Product.objects.create(name="Akupunktur", created_by=admin_user)

        registry = ProductExportRegistry()
        names = [p.name for p in registry.get_queryset(admin_user)]
        assert names == sorted(names)

    def test_default_fields_present(self):
        registry = ProductExportRegistry()
        assert "name" in registry.default_fields
        assert "slug" in registry.default_fields


# ---------------------------------------------------------------------------
# TagExportRegistry
# ---------------------------------------------------------------------------

class TestTagExportRegistry:
    def test_get_queryset_returns_all_tags_ordered_by_name(self, admin_user):
        Tag.objects.create(tag_name="VIP", color="#FF0000")
        Tag.objects.create(tag_name="Aday", color="#00FF00")

        registry = TagExportRegistry()
        names = [t.tag_name for t in registry.get_queryset(admin_user)]
        assert names == sorted(names)

    def test_model_name_is_tag(self):
        assert TagExportRegistry.model_name == "tag"


# ---------------------------------------------------------------------------
# UserExportRegistry
# ---------------------------------------------------------------------------

class TestUserExportRegistry:
    def test_get_queryset_returns_all_users_ordered_by_username(self, admin_user, regular_user):
        registry = UserExportRegistry()
        usernames = [u.username for u in registry.get_queryset(admin_user)]
        assert usernames == sorted(usernames)
        assert admin_user.username in usernames
        assert regular_user.username in usernames

    def test_default_fields_present(self):
        registry = UserExportRegistry()
        assert "username" in registry.default_fields
        assert "email" in registry.default_fields


# ---------------------------------------------------------------------------
# AppointmentPaymentExportRegistry
# ---------------------------------------------------------------------------

class TestAppointmentPaymentExportRegistry:
    def test_get_queryset_returns_all_payments(self, admin_user):
        customer = _make_customer(name="Funda", phone="5001110020", created_by=admin_user)
        product = Product.objects.create(name="Dolgu", created_by=admin_user)
        appt = _make_appointment(name="R3", customer=customer, product=product, created_by=admin_user)
        _make_payment(appointment=appt, created_by=admin_user)

        registry = AppointmentPaymentExportRegistry()
        assert registry.get_queryset(admin_user).count() == 1

    def test_get_field_value_appointment_name(self, admin_user):
        customer = _make_customer(name="Gaye", phone="5001110021", created_by=admin_user)
        product = Product.objects.create(name="Kalıcı Makyaj", created_by=admin_user)
        appt = _make_appointment(name="ÖnemliRandevu", customer=customer, product=product, created_by=admin_user)
        payment = _make_payment(appointment=appt, created_by=admin_user)

        registry = AppointmentPaymentExportRegistry()
        value = registry.get_field_value(payment, "appointment")
        assert value == "ÖnemliRandevu"

    def test_model_name_is_payments(self):
        assert AppointmentPaymentExportRegistry.model_name == "payments"
