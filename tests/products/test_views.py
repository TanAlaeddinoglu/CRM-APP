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
