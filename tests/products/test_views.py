import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework.test import APIRequestFactory

from customer.models import Customer
from products.models import CustomerProduct, Product
from products.views import CustomerProductsViewSet

pytestmark = pytest.mark.django_db

User = get_user_model()


def test_customer_products_viewset_queryset_for_roles():
    admin = User.objects.create_superuser(
        username="admin", email="admin@example.com", password="pass"
    )
    regular = User.objects.create_user(username="user", password="pass")
    other = User.objects.create_user(username="other", password="pass")

    customer_a = Customer.objects.create(
        customer_name="A",
        customer_surname="B",
        customer_phone="1700000000",
        assigned_to=regular,
    )
    customer_b = Customer.objects.create(
        customer_name="C",
        customer_surname="D",
        customer_phone="1700000001",
        assigned_to=other,
    )
    product = Product.objects.create(name="Service", created_by=admin)
    CustomerProduct.objects.create(customer=customer_a, product=product)
    CustomerProduct.objects.create(customer=customer_b, product=product)

    factory = APIRequestFactory()
    viewset = CustomerProductsViewSet()

    request = factory.get("/customer-products/")
    request.user = AnonymousUser()
    viewset.request = request
    assert viewset.get_queryset().count() == 0

    request = factory.get("/customer-products/")
    request.user = regular
    viewset.request = request
    assert viewset.get_queryset().count() == 1

    request = factory.get("/customer-products/")
    request.user = admin
    viewset.request = request
    assert viewset.get_queryset().count() == 2


def test_products_create_requires_admin(regular_client):
    response = regular_client.post(
        "/api/products/",
        {"name": "Unauthorized Product"},
        format="json",
    )

    assert response.status_code == 403


def test_products_create_allows_admin(admin_client):
    response = admin_client.post(
        "/api/products/",
        {"name": "Authorized Product"},
        format="json",
    )

    assert response.status_code == 201
    assert Product.objects.filter(name="Authorized Product").exists()


def test_customer_products_create_rejects_regular_user_for_other_users_customer(
    regular_client, regular_user, admin_user
):
    other_user = User.objects.create_user(username="other-owner", password="pass")
    product = Product.objects.create(name="Assigned Service", created_by=admin_user)
    foreign_customer = Customer.objects.create(
        customer_name="Foreign",
        customer_surname="Owner",
        customer_phone="1700000002",
        assigned_to=other_user,
    )

    response = regular_client.post(
        "/api/products/customer-products/",
        {"customer_id": foreign_customer.id, "product_id": product.id},
        format="json",
    )

    assert response.status_code == 403
    assert CustomerProduct.objects.count() == 0


def test_customer_products_create_allows_regular_user_for_owned_customer(
    regular_client, regular_user, admin_user
):
    product = Product.objects.create(name="Owned Service", created_by=admin_user)
    own_customer = Customer.objects.create(
        customer_name="Owned",
        customer_surname="Customer",
        customer_phone="1700000003",
        assigned_to=regular_user,
    )

    response = regular_client.post(
        "/api/products/customer-products/",
        {"customer_id": own_customer.id, "product_id": product.id},
        format="json",
    )

    assert response.status_code == 201
    assert CustomerProduct.objects.filter(
        customer=own_customer,
        product=product,
        created_by=regular_user,
    ).exists()


def test_customer_products_create_allows_admin_for_any_customer(
    admin_client, admin_user
):
    other_user = User.objects.create_user(username="owned-by-other", password="pass")
    product = Product.objects.create(name="Admin Service", created_by=admin_user)
    foreign_customer = Customer.objects.create(
        customer_name="Admin",
        customer_surname="Target",
        customer_phone="1700000004",
        assigned_to=other_user,
    )

    response = admin_client.post(
        "/api/products/customer-products/",
        {"customer_id": foreign_customer.id, "product_id": product.id},
        format="json",
    )

    assert response.status_code == 201
    assert CustomerProduct.objects.filter(
        customer=foreign_customer,
        product=product,
        created_by=admin_user,
    ).exists()
