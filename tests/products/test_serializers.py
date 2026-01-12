import pytest
from rest_framework import serializers
from rest_framework.test import APIRequestFactory
from django.contrib.auth import get_user_model

from customer.models import Customer
from products.models import CustomerProduct, Product
from products.serializers import CustomerProductsSerializer, ProductSerializer

pytestmark = pytest.mark.django_db

User = get_user_model()


def test_product_serializer_creates_with_created_by():
    user = User.objects.create_user(username="maker", password="pass")
    factory = APIRequestFactory()
    request = factory.post("/products/")
    request.user = user

    serializer = ProductSerializer(
        data={"name": "Gadget"}, context={"request": request}
    )
    assert serializer.is_valid(), serializer.errors
    product = serializer.save()

    assert product.created_by == user


def test_product_serializer_rejects_duplicate_slug():
    user = User.objects.create_user(username="dup", password="pass")
    Product.objects.create(name="Widget", created_by=user)

    serializer = ProductSerializer(data={"name": "Widget"})
    assert not serializer.is_valid()
    assert "name" in serializer.errors


def test_customer_products_serializer_rejects_duplicate_assignment():
    user = User.objects.create_user(username="dup2", password="pass")
    customer = Customer.objects.create(
        customer_name="A",
        customer_surname="B",
        customer_phone="1600000000",
    )
    product = Product.objects.create(name="Service", created_by=user)
    CustomerProduct.objects.create(customer=customer, product=product)

    serializer = CustomerProductsSerializer(
        data={"customer_id": customer.id, "product_id": product.id}
    )
    assert not serializer.is_valid()
    assert "product" in serializer.errors


def test_customer_products_serializer_create_sets_created_by():
    user = User.objects.create_user(username="creator", password="pass")
    customer = Customer.objects.create(
        customer_name="C",
        customer_surname="D",
        customer_phone="1600000001",
    )
    product = Product.objects.create(name="Plan", created_by=user)
    factory = APIRequestFactory()
    request = factory.post("/customer-products/")
    request.user = user

    serializer = CustomerProductsSerializer(
        data={"customer_id": customer.id, "product_id": product.id},
        context={"request": request},
    )
    assert serializer.is_valid(), serializer.errors
    assignment = serializer.save()

    assert assignment.created_by == user


def test_customer_products_serializer_prevents_customer_change_for_non_admin():
    user = User.objects.create_user(username="regular", password="pass")
    customer = Customer.objects.create(
        customer_name="E",
        customer_surname="F",
        customer_phone="1600000002",
    )
    other_customer = Customer.objects.create(
        customer_name="G",
        customer_surname="H",
        customer_phone="1600000003",
    )
    product = Product.objects.create(name="Block", created_by=user)
    assignment = CustomerProduct.objects.create(customer=customer, product=product)
    factory = APIRequestFactory()
    request = factory.patch("/customer-products/")
    request.user = user

    serializer = CustomerProductsSerializer(
        assignment,
        data={"customer_id": other_customer.id},
        partial=True,
        context={"request": request},
    )
    assert serializer.is_valid(), serializer.errors
    with pytest.raises(serializers.ValidationError):
        serializer.save()


def test_customer_products_serializer_allows_change_for_superuser(admin_user):
    customer = Customer.objects.create(
        customer_name="I",
        customer_surname="J",
        customer_phone="1600000004",
    )
    other_customer = Customer.objects.create(
        customer_name="K",
        customer_surname="L",
        customer_phone="1600000005",
    )
    product = Product.objects.create(name="Allow", created_by=admin_user)
    assignment = CustomerProduct.objects.create(customer=customer, product=product)
    factory = APIRequestFactory()
    request = factory.patch("/customer-products/")
    request.user = admin_user

    serializer = CustomerProductsSerializer(
        assignment,
        data={"customer_id": other_customer.id},
        partial=True,
        context={"request": request},
    )
    assert serializer.is_valid(), serializer.errors
    updated = serializer.save()

    assert updated.customer_id == other_customer.id
