import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.test import APIRequestFactory, force_authenticate

from customer.models import Customer, Tag, Notes, CustomerTagHistory
from customer.serializers import NotesSerializer
from customer.views import (
    CustomerTagHistoryViewSet,
    NotesViewSet,
    TagViewSet,
    UserCustomerViewSet,
)
from products.models import CustomerProduct, Product

pytestmark = pytest.mark.django_db

User = get_user_model()


def _make_tag(name="VIP", color="#FF0000", description="desc"):
    return Tag.objects.create(tag_name=name, color=color, description=description)


def _make_customer(name, phone, assigned_to=None, created_by=None, tag=None):
    return Customer.objects.create(
        customer_name=name,
        customer_surname="User",
        customer_phone=phone,
        assigned_to=assigned_to,
        created_by=created_by,
        tag=tag,
    )


def test_user_partial_update_rejects_empty_payload(regular_user, admin_user):
    customer = _make_customer(
        "Empty",
        "1000000000",
        assigned_to=regular_user,
        created_by=admin_user,
    )
    factory = APIRequestFactory()
    view = UserCustomerViewSet.as_view({"patch": "partial_update"})
    request = factory.patch("/customers/me/", {}, format="json")
    force_authenticate(request, user=regular_user)
    response = view(request, pk=customer.pk)
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_user_partial_update_rejects_unallowed_field(regular_user, admin_user):
    customer = _make_customer(
        "Bad",
        "1000000001",
        assigned_to=regular_user,
        created_by=admin_user,
    )
    factory = APIRequestFactory()
    view = UserCustomerViewSet.as_view({"patch": "partial_update"})
    request = factory.patch(
        "/customers/me/", {"customer_name": "Changed"}, format="json"
    )
    force_authenticate(request, user=regular_user)
    response = view(request, pk=customer.pk)
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_user_partial_update_allows_tag_change(regular_user, admin_user):
    tag = _make_tag("Hot")
    customer = _make_customer(
        "Tagged",
        "1000000002",
        assigned_to=regular_user,
        created_by=admin_user,
    )
    factory = APIRequestFactory()
    view = UserCustomerViewSet.as_view({"patch": "partial_update"})
    request = factory.patch("/customers/me/", {"tag": tag.id}, format="json")
    force_authenticate(request, user=regular_user)
    response = view(request, pk=customer.pk)

    assert response.status_code == status.HTTP_200_OK
    customer.refresh_from_db()
    assert customer.tag_id == tag.id


def test_user_partial_update_allows_products_change_for_owned_customer(
    regular_user, admin_user
):
    customer = _make_customer(
        "Products",
        "1000000011",
        assigned_to=regular_user,
        created_by=admin_user,
    )
    product = Product.objects.create(name="Checkup", created_by=admin_user)

    factory = APIRequestFactory()
    view = UserCustomerViewSet.as_view({"patch": "partial_update"})
    request = factory.patch("/customers/me/", {"products": product.name}, format="json")
    force_authenticate(request, user=regular_user)
    response = view(request, pk=customer.pk)

    assert response.status_code == status.HTTP_200_OK
    assert CustomerProduct.objects.filter(customer=customer, product=product).exists()


def test_user_partial_update_rejects_empty_note(regular_user, admin_user):
    customer = _make_customer(
        "Note",
        "1000000003",
        assigned_to=regular_user,
        created_by=admin_user,
    )
    factory = APIRequestFactory()
    view = UserCustomerViewSet.as_view({"patch": "partial_update"})
    request = factory.patch("/customers/me/", {"note": ""}, format="json")
    force_authenticate(request, user=regular_user)
    response = view(request, pk=customer.pk)
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_user_partial_update_invalid_tag_returns_404(regular_user, admin_user):
    customer = _make_customer(
        "Invalid",
        "1000000004",
        assigned_to=regular_user,
        created_by=admin_user,
    )
    factory = APIRequestFactory()
    view = UserCustomerViewSet.as_view({"patch": "partial_update"})
    request = factory.patch("/customers/me/", {"tag": 9999}, format="json")
    force_authenticate(request, user=regular_user)
    response = view(request, pk=customer.pk)
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_user_partial_update_denies_unassigned_user(regular_user, admin_user):
    other = User.objects.create_user(username="other", password="pass")
    customer = _make_customer(
        "NoAccess",
        "1000000005",
        assigned_to=other,
        created_by=admin_user,
    )
    tag = _make_tag("Cold")
    factory = APIRequestFactory()
    view = UserCustomerViewSet.as_view({"patch": "partial_update"})
    request = factory.patch("/customers/me/", {"tag": tag.id}, format="json")
    force_authenticate(request, user=regular_user)
    response = view(request, pk=customer.pk)
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_tag_viewset_permissions():
    factory = APIRequestFactory()
    viewset = TagViewSet()
    viewset.request = factory.get("/tag/")
    perms = viewset.get_permissions()
    assert any(isinstance(p, IsAuthenticated) for p in perms)

    viewset.request = factory.post("/tag/")
    perms = viewset.get_permissions()
    assert any(isinstance(p, IsAdminUser) for p in perms)


def test_tag_history_queryset_filters_by_assignment(regular_user, admin_user):
    tag = _make_tag("History")
    assigned = _make_customer("Assigned", "1000000006", assigned_to=regular_user)
    other = _make_customer("Other", "1000000007", assigned_to=admin_user)

    CustomerTagHistory.objects.create(
        customer=assigned,
        from_tag=None,
        to_tag=tag,
        changed_by=regular_user,
    )
    CustomerTagHistory.objects.create(
        customer=other,
        from_tag=None,
        to_tag=tag,
        changed_by=admin_user,
    )

    factory = APIRequestFactory()
    viewset = CustomerTagHistoryViewSet()
    request = factory.get("/tag-history/")
    request.user = regular_user
    viewset.request = request
    qs = viewset.get_queryset()
    assert qs.count() == 1
    assert qs.first().customer_id == assigned.id

    request = factory.get("/tag-history/")
    request.user = admin_user
    viewset.request = request
    qs = viewset.get_queryset()
    assert qs.count() == 2


def test_notes_viewset_queryset_filters_by_assignment(regular_user, admin_user):
    assigned = _make_customer("Notes", "1000000008", assigned_to=regular_user)
    other = _make_customer("Other", "1000000009", assigned_to=admin_user)
    Notes.objects.create(customer=assigned, note="Note 1", created_by=regular_user)
    Notes.objects.create(customer=other, note="Note 2", created_by=admin_user)

    factory = APIRequestFactory()
    viewset = NotesViewSet()
    request = factory.get("/notes/")
    request.user = regular_user
    viewset.request = request
    qs = viewset.get_queryset()
    assert qs.count() == 1
    assert qs.first().customer_id == assigned.id

    request = factory.get("/notes/")
    request.user = admin_user
    viewset.request = request
    qs = viewset.get_queryset()
    assert qs.count() == 2

    request = factory.get("/notes/")
    request.user = AnonymousUser()
    viewset.request = request
    qs = viewset.get_queryset()
    assert qs.count() == 0


def test_notes_viewset_perform_create_requires_assignment(regular_user, admin_user):
    customer = _make_customer(
        "NoNote",
        "1000000010",
        assigned_to=admin_user,
        created_by=admin_user,
    )
    factory = APIRequestFactory()
    request = factory.post("/notes/")
    request.user = regular_user

    serializer = NotesSerializer(
        data={"customer_id": customer.id, "note": "Note"},
        context={"request": request},
    )
    serializer.is_valid(raise_exception=True)

    viewset = NotesViewSet()
    viewset.request = request
    with pytest.raises(NotFound):
        viewset.perform_create(serializer)
