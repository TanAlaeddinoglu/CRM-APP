import pytest

from customer.filters import CustomerFilter
from customer.models import Customer, Tag

pytestmark = pytest.mark.django_db


def _make_tag(name="VIP", color="#FF0000", description="desc"):
    return Tag.objects.create(tag_name=name, color=color, description=description)


def test_customer_filter_tag_null_and_id():
    tag = _make_tag("Filter")
    with_tag = Customer.objects.create(
        customer_name="Tagged",
        customer_surname="User",
        customer_phone="1100000000",
        tag=tag,
    )
    without_tag = Customer.objects.create(
        customer_name="Untagged",
        customer_surname="User",
        customer_phone="1100000001",
        tag=None,
    )

    qs = Customer.objects.all()
    filtered = CustomerFilter(data={"tag": "null"}, queryset=qs).qs
    assert list(filtered) == [without_tag]

    filtered = CustomerFilter(data={"tag": str(tag.id)}, queryset=qs).qs
    assert list(filtered) == [with_tag]
