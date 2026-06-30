"""Ürün bildirim sinyali testleri."""
import pytest

import products.notifications.notification_types  # noqa: registry'yi doldur
from notifications.models import Notification, NotificationRule


pytestmark = pytest.mark.django_db(transaction=True)


@pytest.fixture(autouse=True)
def rules(db):
    for key, name in [
        ("products.product_created", "Ürün oluşturuldu"),
        ("products.product_updated", "Ürün güncellendi"),
        ("products.product_deleted", "Ürün silindi"),
    ]:
        NotificationRule.objects.get_or_create(
            type_key=key,
            is_system_default=True,
            defaults={"name": name, "channels": ["in_app"], "is_active": True},
        )


@pytest.fixture
def admin_user(db):
    from django.contrib.auth import get_user_model

    return get_user_model().objects.create_user(
        username="p_admin", email="p_admin@x.com", password="Pass123!", role="ADMIN"
    )


def test_product_created_notifies_admins(admin_user):
    from products.models import Product

    Notification.objects.all().delete()
    Product.objects.create(name="Ürün 1")
    assert Notification.objects.filter(
        recipient=admin_user, type_key="products.product_created"
    ).exists()


def test_product_updated_notifies_admins(admin_user):
    from products.models import Product

    product = Product.objects.create(name="Ürün 2")
    Notification.objects.all().delete()
    product.description = "guncel"
    product.save()
    assert Notification.objects.filter(
        recipient=admin_user, type_key="products.product_updated"
    ).exists()


def test_product_deleted_notifies_admins(admin_user):
    from products.models import Product

    product = Product.objects.create(name="Ürün 3")
    Notification.objects.all().delete()
    product.delete()
    assert Notification.objects.filter(
        recipient=admin_user, type_key="products.product_deleted"
    ).exists()
