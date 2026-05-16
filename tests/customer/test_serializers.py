import pytest
from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.test import APIRequestFactory

from customer.models import Customer, Tag, CustomerTagHistory
from customer.serializers import (
    CustomerSerializer,
    CustomerTagHistorySerializer,
    NotesSerializer,
    TagSerializer,
)

pytestmark = pytest.mark.django_db

User = get_user_model()


def _make_tag(name="VIP", color="#FF0000", description="desc"):
    return Tag.objects.create(tag_name=name, color=color, description=description)


def test_customer_serializer_requires_phone():
    serializer = CustomerSerializer(
        data={"customer_name": "A", "customer_surname": "B"}
    )
    assert not serializer.is_valid()
    assert "customer_phone" in serializer.errors


def test_customer_serializer_validates_phone_format():
    serializer = CustomerSerializer(
        data={
            "customer_name": "A",
            "customer_surname": "B",
            "customer_phone": "abc",
        }
    )
    assert not serializer.is_valid()
    assert "customer_phone" in serializer.errors


def test_customer_serializer_rejects_duplicate_phone():
    Customer.objects.create(
        customer_name="Dup",
        customer_surname="Phone",
        customer_phone="1111111111",
    )
    serializer = CustomerSerializer(
        data={
            "customer_name": "New",
            "customer_surname": "User",
            "customer_phone": "1111111111",
        }
    )
    assert not serializer.is_valid()
    assert "customer_phone" in serializer.errors


def test_customer_serializer_create_sets_creator_and_tag():
    user = User.objects.create_user(username="creator", password="pass")
    tag = _make_tag("VIP")
    factory = APIRequestFactory()
    request = factory.post("/customers/")
    request.user = user

    serializer = CustomerSerializer(
        data={
            "customer_name": "C",
            "customer_surname": "D",
            "customer_phone": "+1234567890",
        },
        context={"request": request, "tag": tag},
    )
    assert serializer.is_valid(), serializer.errors
    customer = serializer.save()

    assert customer.created_by == user
    assert customer.updated_by == user
    assert customer.tag_id == tag.id
    assert customer.assigned_to_id == user.id
    assert customer.customer_phone == "1234567890"
    assert CustomerTagHistory.objects.filter(customer=customer).count() == 1


def test_customer_serializer_update_strips_plus_from_phone():
    customer = Customer.objects.create(
        customer_name="Plus",
        customer_surname="Update",
        customer_phone="8888888888",
    )

    serializer = CustomerSerializer(
        customer,
        data={"customer_phone": "+9988776655"},
        partial=True,
    )

    assert serializer.is_valid(), serializer.errors
    updated = serializer.save()

    assert updated.customer_phone == "9988776655"


def test_customer_serializer_create_pool_skips_tag():
    tag = _make_tag("Pool")
    serializer = CustomerSerializer(
        data={
            "customer_name": "Pool",
            "customer_surname": "User",
            "customer_phone": "2222222222",
            "status": "pool",
            "tag_id": tag.id,
        }
    )
    assert serializer.is_valid(), serializer.errors
    customer = serializer.save()
    assert customer.status == "pool"
    assert customer.tag is None


def test_customer_serializer_update_archives():
    customer = Customer.objects.create(
        customer_name="Arch",
        customer_surname="Ive",
        customer_phone="3333333333",
    )
    serializer = CustomerSerializer(
        customer,
        data={"status": "archived", "customer_phone": customer.customer_phone},
        partial=True,
    )
    assert serializer.is_valid(), serializer.errors
    updated = serializer.save()

    assert updated.status == "pool"
    assert updated.archived_at is not None
    assert updated.is_active is False


def test_customer_serializer_update_assign_without_tag_raises():
    user = User.objects.create_user(username="assign", password="pass")
    customer = Customer.objects.create(
        customer_name="No",
        customer_surname="Tag",
        customer_phone="4444444444",
    )
    serializer = CustomerSerializer(
        customer,
        data={"assigned": user.id, "customer_phone": customer.customer_phone},
        partial=True,
    )
    assert serializer.is_valid(), serializer.errors
    with pytest.raises(serializers.ValidationError):
        serializer.save()


def test_customer_serializer_update_clearing_tag_moves_to_pool():
    user = User.objects.create_user(username="clear", password="pass")
    tag = _make_tag("Active")
    customer = Customer.objects.create(
        customer_name="Keep",
        customer_surname="Tag",
        customer_phone="5555555555",
        assigned_to=user,
        tag=tag,
        status="active",
    )
    serializer = CustomerSerializer(
        customer,
        data={"tag_id": None, "customer_phone": customer.customer_phone},
        partial=True,
    )
    assert serializer.is_valid(), serializer.errors
    updated = serializer.save()

    assert updated.tag is None
    assert updated.assigned_to is None
    assert updated.status == "pool"


def test_tag_serializer_rejects_duplicate_slug():
    _make_tag("Same")
    serializer = TagSerializer(
        data={"tag_name": "Same", "color": "#FF0000", "description": "x"}
    )
    assert not serializer.is_valid()
    assert "tag_name" in serializer.errors


def test_customer_tag_history_serializer_fields():
    user = User.objects.create_user(username="history", password="pass")
    tag_from = _make_tag("From")
    tag_to = _make_tag("To")
    customer = Customer.objects.create(
        customer_name="His",
        customer_surname="Tory",
        customer_phone="6666666666",
        assigned_to=user,
    )
    history = CustomerTagHistory.objects.create(
        customer=customer,
        from_tag=tag_from,
        to_tag=tag_to,
        changed_by=user,
    )
    serializer = CustomerTagHistorySerializer(history)
    assert serializer.data["from_tag"] == "From"
    assert serializer.data["to_tag"] == "To"
    assert serializer.data["customer"] == "His Tory"


def test_notes_serializer_sets_created_and_updated_by():
    user = User.objects.create_user(username="note", password="pass")
    other = User.objects.create_user(username="note2", password="pass")
    customer = Customer.objects.create(
        customer_name="Note",
        customer_surname="User",
        customer_phone="7777777777",
    )
    factory = APIRequestFactory()
    create_request = factory.post("/notes/")
    create_request.user = user

    serializer = NotesSerializer(
        data={"customer_id": customer.id, "note": "Created"},
        context={"request": create_request},
    )
    assert serializer.is_valid(), serializer.errors
    note = serializer.save()
    assert note.created_by == user

    update_request = factory.patch("/notes/")
    update_request.user = other
    update_serializer = NotesSerializer(
        note,
        data={"note": "Updated", "customer_id": customer.id},
        context={"request": update_request},
        partial=True,
    )
    assert update_serializer.is_valid(), update_serializer.errors
    updated = update_serializer.save()
    assert updated.updated_by == other
