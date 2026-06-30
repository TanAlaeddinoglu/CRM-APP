import pytest
from django.contrib.auth import get_user_model
from rest_framework.exceptions import NotFound

from customer.models import Customer, Tag
from customer.services import (
    CustomerService,
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


# ---------------------------------------------------------------------------
# CustomerService.bulk_create — tag + assigned_to mantığı
# ---------------------------------------------------------------------------

def _base_item(**kwargs):
    defaults = {
        "customer_name": "Test",
        "customer_surname": "User",
        "customer_phone": "905551234567",
        "source": "excel",
    }
    defaults.update(kwargs)
    return defaults


class TestBulkCreateTagAssignedLogic:
    """
    İş kuralı: assigned_to VE tag ikisi birlikte varsa → active + tag atanır.
    Biri ya da ikisi eksikse → pool, tag uygulanmaz.
    """

    def test_both_assigned_and_tag_sets_active_and_applies_tag(self, db):
        actor = User.objects.create_user(username="actor1", password="pass")
        assignee = User.objects.create_user(username="assignee1", password="pass")
        tag = Tag.objects.create(tag_name="VIP", color="#000", description="")

        CustomerService.bulk_create(
            [_base_item(assigned_to=assignee.id, tag=tag.id)],
            actor,
        )

        c = Customer.objects.get(customer_phone="905551234567")
        assert c.status == "active"
        assert c.is_active is True
        assert c.assigned_to_id == assignee.id
        assert c.tag_id == tag.id

    def test_tag_only_no_assigned_goes_to_pool(self, db):
        actor = User.objects.create_user(username="actor2", password="pass")
        tag = Tag.objects.create(tag_name="Promo", color="#111", description="")

        CustomerService.bulk_create(
            [_base_item(customer_phone="905551234568", tag=tag.id)],
            actor,
        )

        c = Customer.objects.get(customer_phone="905551234568")
        assert c.status == "pool"
        assert c.is_active is False
        assert c.tag is None

    def test_assigned_only_no_tag_goes_to_pool(self, db):
        actor = User.objects.create_user(username="actor3", password="pass")
        assignee = User.objects.create_user(username="assignee3", password="pass")

        CustomerService.bulk_create(
            [_base_item(customer_phone="905551234569", assigned_to=assignee.id)],
            actor,
        )

        c = Customer.objects.get(customer_phone="905551234569")
        assert c.status == "pool"
        assert c.is_active is False
        assert c.assigned_to is None

    def test_neither_tag_nor_assigned_goes_to_pool(self, db):
        actor = User.objects.create_user(username="actor4", password="pass")

        CustomerService.bulk_create(
            [_base_item(customer_phone="905551234570")],
            actor,
        )

        c = Customer.objects.get(customer_phone="905551234570")
        assert c.status == "pool"
        assert c.is_active is False
        assert c.tag is None
        assert c.assigned_to is None

    def test_mixed_rows_correct_statuses(self, db):
        """Aynı toplu işlemde hem active hem pool satırlar doğru ayrışmalı."""
        actor = User.objects.create_user(username="actor5", password="pass")
        assignee = User.objects.create_user(username="assignee5", password="pass")
        tag = Tag.objects.create(tag_name="Mix", color="#222", description="")

        CustomerService.bulk_create(
            [
                _base_item(customer_phone="905551234571", assigned_to=assignee.id, tag=tag.id),
                _base_item(customer_phone="905551234572"),  # pool
                _base_item(customer_phone="905551234573", tag=tag.id),  # pool (tag tek başına yetmez)
            ],
            actor,
        )

        active_c = Customer.objects.get(customer_phone="905551234571")
        pool_c1 = Customer.objects.get(customer_phone="905551234572")
        pool_c2 = Customer.objects.get(customer_phone="905551234573")

        assert active_c.status == "active" and active_c.tag_id == tag.id
        assert pool_c1.status == "pool" and pool_c1.tag is None
        assert pool_c2.status == "pool" and pool_c2.tag is None


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
