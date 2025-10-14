# tests/customers/test_set_current_tag.py
import pytest
from customer.models import CustomerTagHistory

pytestmark = pytest.mark.django_db


def test_no_change_when_both_none(customer, admin):
    # Initially no tag
    assert customer.tag is None

    # No-op: keep None -> None
    customer.set_current_tag(None, by=admin, notes="no change")
    customer.refresh_from_db()

    assert customer.tag is None
    assert CustomerTagHistory.objects.filter(customer=customer).count() == 0


def test_no_change_when_same_tag(customer, admin, tag_a):
    # Set first time (creates history)
    customer.set_current_tag(tag_a, by=admin, notes="initial")
    customer.refresh_from_db()
    assert customer.tag == tag_a
    assert CustomerTagHistory.objects.filter(customer=customer).count() == 1

    # No-op: setting to same tag again should not create new history
    customer.set_current_tag(tag_a, by=admin, notes="same again")
    customer.refresh_from_db()

    assert customer.tag == tag_a
    assert CustomerTagHistory.objects.filter(customer=customer).count() == 1


def test_change_creates_history_and_updates_current(customer, admin, tag_a, tag_b):
    # First set: None -> tag_a
    customer.set_current_tag(tag_a, by=admin, notes="initial")
    customer.refresh_from_db()
    assert customer.tag == tag_a
    h1 = CustomerTagHistory.objects.filter(customer=customer).order_by("changed_at").last()
    assert h1.from_tag is None
    assert h1.to_tag == tag_a
    assert h1.changed_by == admin

    # Change: tag_a -> tag_b
    customer.set_current_tag(tag_b, by=admin, notes="promoted")
    customer.refresh_from_db()
    assert customer.tag == tag_b

    histories = list(CustomerTagHistory.objects.filter(customer=customer).order_by("changed_at"))
    assert len(histories) == 2

    last = histories[-1]
    assert last.from_tag == tag_a
    assert last.to_tag == tag_b
    assert last.changed_by == admin
    assert last.notes == "promoted"
    # updated_by should be set too
    assert customer.updated_by == admin


def test_clear_tag_creates_history(customer, admin, tag_a):
    # Set initial tag
    customer.set_current_tag(tag_a, by=admin, notes="initial")
    customer.refresh_from_db()
    assert customer.tag == tag_a

    # Clear tag: tag_a -> None
    customer.set_current_tag(None, by=admin, notes="cleared")
    customer.refresh_from_db()
    assert customer.tag is None

    last = CustomerTagHistory.objects.filter(customer=customer).order_by("changed_at").last()
    assert last.from_tag == tag_a
    assert last.to_tag is None
    assert last.changed_by == admin
    assert last.notes == "cleared"


def test_history_ordering_desc(customer, admin, tag_a, tag_b):
    # Two transitions
    customer.set_current_tag(tag_a, by=admin)
    customer.set_current_tag(tag_b, by=admin)

    rows = CustomerTagHistory.objects.filter(customer=customer).order_by("-changed_at")
    assert rows.count() == 2
    # newest is tag_a -> tag_b
    assert rows.first().to_tag == tag_b
