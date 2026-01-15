import pytest
from django.contrib.auth import get_user_model
from rest_framework.exceptions import NotFound

from customer.models import Customer, Tag
from customer.services import (
    is_admin_or_assigned_to_user,
    move_to_customer,
    move_to_customer_pool,
)

pytestmark = pytest.mark.django_db

User = get_user_model()


def _make_tag(name="VIP", color="#FF0000", description="desc"):
    return Tag.objects.create(tag_name=name, color=color, description=description)


def test_move_to_customer_pool_no_change():
    user = User.objects.create_user(username="pool", password="pass")
    customer = Customer.objects.create(
        customer_name="A",
        customer_surname="B",
        customer_phone="1234567896",
        status="pool",
        created_by=user,
    )
    assert move_to_customer_pool(customer) is False


def test_move_to_customer_pool_clears_fields():
    user = User.objects.create_user(username="pool2", password="pass")
    tag = _make_tag("Tag")
    customer = Customer.objects.create(
        customer_name="C",
        customer_surname="D",
        customer_phone="1234567897",
        status="active",
        assigned_to=user,
        tag=tag,
        created_by=user,
    )
    moved = move_to_customer_pool(customer, by=user)
    customer.refresh_from_db()

    assert moved is True
    assert customer.assigned_to is None
    assert customer.tag is None
    assert customer.status == "pool"
    assert customer.updated_by == user


def test_move_to_customer_requires_unassigned_and_tag():
    user = User.objects.create_user(username="move", password="pass")
    customer = Customer.objects.create(
        customer_name="E",
        customer_surname="F",
        customer_phone="1234567898",
        assigned_to=user,
        created_by=user,
    )
    assert move_to_customer(customer, user=user, tag_id=1) is False

    customer.assigned_to = None
    customer.save(update_fields=["assigned_to"])
    assert move_to_customer(customer, user=user) is False

    tag = _make_tag("Assign")
    assert move_to_customer(customer, user=user, tag_id=tag.id) is True
    customer.refresh_from_db()
    assert customer.assigned_to_id == user.id
    assert customer.tag_id == tag.id
    assert customer.status == "active"


def test_is_admin_or_assigned_to_user_raises():
    user = User.objects.create_user(username="nonadmin", password="pass")
    other = User.objects.create_user(username="owner", password="pass")
    customer = Customer.objects.create(
        customer_name="G",
        customer_surname="H",
        customer_phone="1234567899",
        assigned_to=other,
        created_by=other,
    )
    with pytest.raises(NotFound):
        is_admin_or_assigned_to_user(None, customer, user)
