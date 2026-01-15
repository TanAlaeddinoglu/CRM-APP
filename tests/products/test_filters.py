import pytest

from customer.models import Customer
from products.filters import CustomerProductFilter, ProductFilter
from products.models import CustomerProduct, Product

pytestmark = pytest.mark.django_db


def test_product_filter_by_name():
    product1 = Product.objects.create(name="Alpha")
    Product.objects.create(name="Beta")

    filtered = ProductFilter(data={"name": "alp"}, queryset=Product.objects.all()).qs
    assert list(filtered) == [product1]


def test_customer_product_filter_by_product_id():
    customer = Customer.objects.create(
        customer_name="A",
        customer_surname="B",
        customer_phone="1800000000",
    )
    product = Product.objects.create(name="Filter")
    CustomerProduct.objects.create(customer=customer, product=product)

    filtered = CustomerProductFilter(
        data={"productId": product.id},
        queryset=CustomerProduct.objects.all(),
    ).qs
    assert filtered.count() == 1
