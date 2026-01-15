import pytest
from datetime import date

from django.contrib.auth import get_user_model
from django.db import transaction

from customer.models import Customer, Tag, CustomerTagHistory

pytestmark = pytest.mark.django_db

User = get_user_model()


def _make_tag(name="VIP", color="#FF0000", description="desc"):
    return Tag.objects.create(tag_name=name, color=color, description=description)


def test_tag_save_generates_unique_slug():
    tag1 = _make_tag("VIP")
    tag2 = _make_tag("VIP")
    assert tag1.slug == "vip"
    assert tag2.slug == "vip-2"


def test_customer_save_sets_active_and_normalizes_email():
    user = User.objects.create_user(username="creator", password="pass")
    customer = Customer.objects.create(
        customer_name="Alice",
        customer_surname="Smith",
        customer_email="Alice@Example.Com",
        customer_phone="1234567890",
        status="archived",
        created_by=user,
    )
    assert customer.email_normalized == "alice@example.com"
    assert customer.is_active is False


def test_customer_full_name_and_age():
    today = date.today()
    try:
        dob = today.replace(year=today.year - 10)
    except ValueError:
        dob = today.replace(month=2, day=28, year=today.year - 10)

    customer = Customer.objects.create(
        customer_name="Bob",
        customer_surname="Jones",
        customer_phone="1234567891",
        date_of_birth=dob,
    )
    assert customer.full_name() == "Bob Jones"
    assert customer.age() == 10


def test_set_current_tag_assigns_and_tracks_history():
    user = User.objects.create_user(username="assigner", password="pass")
    customer = Customer.objects.create(
        customer_name="Cara",
        customer_surname="Lee",
        customer_phone="1234567892",
        created_by=user,
    )
    tag = _make_tag("Hot")
    changed = customer.set_current_tag(tag, by=user)
    customer.refresh_from_db()

    assert changed is True
    assert customer.tag_id == tag.id
    assert customer.assigned_to_id == user.id
    history = CustomerTagHistory.objects.filter(customer=customer)
    assert history.count() == 1


def test_set_current_tag_no_change_returns_false():
    user = User.objects.create_user(username="nochange", password="pass")
    customer = Customer.objects.create(
        customer_name="Dan",
        customer_surname="Kim",
        customer_phone="1234567893",
        created_by=user,
    )
    assert customer.set_current_tag(None, by=user) is False


def test_set_current_tag_clearing_moves_to_pool():
    user = User.objects.create_user(username="clearer", password="pass")
    tag = _make_tag("Warm")
    customer = Customer.objects.create(
        customer_name="Eve",
        customer_surname="Fox",
        customer_phone="1234567894",
        assigned_to=user,
        tag=tag,
        status="active",
        created_by=user,
    )
    changed = customer.set_current_tag(None, by=user)
    customer.refresh_from_db()

    assert changed is True
    assert customer.tag is None
    assert customer.assigned_to is None
    assert customer.status == "pool"


def test_set_pool_assigns_when_tag_and_assignee_provided():
    user = User.objects.create_user(username="pooler", password="pass")
    assignee = User.objects.create_user(username="assignee", password="pass")
    tag = _make_tag("Assigned")
    customer = Customer.objects.create(
        customer_name="Fay",
        customer_surname="Ray",
        customer_phone="1234567895",
        created_by=user,
    )
    with transaction.atomic():
        moved = customer.set_pool(new_tag=tag, by=user, assign_to=assignee)
    customer.refresh_from_db()

    assert moved is True
    assert customer.tag_id == tag.id
    assert customer.assigned_to_id == assignee.id
    assert customer.status == "active"
