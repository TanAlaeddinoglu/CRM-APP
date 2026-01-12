import pytest

from django.contrib.auth import get_user_model

from customer.models import Customer
from products.models import CustomerProduct, Product

pytestmark = pytest.mark.django_db

User = get_user_model()


def test_product_save_generates_unique_slug():
    user = User.objects.create_user(username="prod", password="pass")
    product1 = Product.objects.create(name="My Product", created_by=user)
    product2 = Product.objects.create(name="My-Product", created_by=user)

    assert product1.slug == "my-product"
    assert product2.slug == "my-product-2"


def test_customer_product_str_contains_names():
    user = User.objects.create_user(username="prod2", password="pass")
    customer = Customer.objects.create(
        customer_name="Name",
        customer_surname="Surname",
        customer_phone="1500000000",
    )
    product = Product.objects.create(name="Widget", created_by=user)
    assignment = CustomerProduct.objects.create(customer=customer, product=product)

    rendered = str(assignment)
    assert customer.full_name() in rendered
    assert product.name in rendered
