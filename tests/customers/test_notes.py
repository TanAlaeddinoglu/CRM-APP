import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIRequestFactory

from customer.models import Customer, Notes
from customer.serializers import NotesSerializer


@pytest.fixture
def customer_assigned(admin_user, regular_user):
    return Customer.objects.create(
        customer_name="Alpha",
        customer_surname="Client",
        customer_email="alpha@example.com",
        customer_phone="10000000000",
        assigned_to=regular_user,
        created_by=admin_user,
    )


@pytest.fixture
def other_customer(admin_user, regular_user):
    other = Customer.objects.create(
        customer_name="Beta",
        customer_surname="Client",
        customer_email="beta@example.com",
        customer_phone="20000000000",
        assigned_to=admin_user,
        created_by=admin_user,
    )
    return other


@pytest.mark.django_db
def test_notes_model_fields(customer_assigned, admin_user):
    note = Notes.objects.create(
        customer=customer_assigned,
        created_by=admin_user,
        note="Initial note",
    )

    assert note.customer == customer_assigned
    assert note.created_by == admin_user
    assert note.updated_by is None
    assert note.created_at is not None
    assert note.updated_at is not None


@pytest.mark.django_db
def test_notes_serializer_populates_created_by(customer_assigned, regular_user):
    factory = APIRequestFactory()
    request = factory.post("/notes/")
    request.user = regular_user

    serializer = NotesSerializer(
        data={"customer": customer_assigned.id, "note": "Created through serializer"},
        context={"request": request},
    )

    assert serializer.is_valid(), serializer.errors

    note = serializer.save()
    assert note.created_by == regular_user
    assert note.note == "Created through serializer"


@pytest.mark.django_db
def test_notes_serializer_sets_updated_by_on_update(
    customer_assigned, admin_user, regular_user
):
    note = Notes.objects.create(
        customer=customer_assigned,
        created_by=regular_user,
        note="Original",
    )

    factory = APIRequestFactory()
    request = factory.patch("/notes/")
    request.user = admin_user

    serializer = NotesSerializer(
        note,
        data={"note": "Updated content", "customer": customer_assigned.id},
        context={"request": request},
        partial=True,
    )

    assert serializer.is_valid(), serializer.errors

    updated_note = serializer.save()
    assert updated_note.updated_by == admin_user
    assert updated_note.note == "Updated content"


@pytest.mark.django_db
def test_admin_can_list_all_notes(
    admin_client, admin_user, customer_assigned, regular_user
):
    other = Customer.objects.create(
        customer_name="Gamma",
        customer_surname="Client",
        customer_email="gamma@example.com",
        customer_phone="30000000000",
        assigned_to=admin_user,
        created_by=admin_user,
    )
    Notes.objects.create(
        customer=customer_assigned, created_by=regular_user, note="Note 1"
    )
    Notes.objects.create(customer=other, created_by=admin_user, note="Note 2")

    url = reverse("notes-list-create")
    response = admin_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 2


@pytest.mark.django_db
def test_regular_user_cannot_list_notes(regular_client):
    url = reverse("notes-list-create")
    response = regular_client.get(url)
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_regular_user_can_create_note_for_assigned_customer(
    regular_client, customer_assigned, regular_user
):
    url = reverse("notes-list-create")
    payload = {
        "customer": customer_assigned.id,
        "note": "Assigned user note",
    }
    response = regular_client.post(url, payload, format="json")

    assert response.status_code == status.HTTP_201_CREATED
    created = Notes.objects.get(id=response.data["id"])
    assert created.created_by == regular_user
    assert created.note == "Assigned user note"


@pytest.mark.django_db
def test_regular_user_cannot_create_note_for_unassigned_customer(
    regular_client, other_customer
):
    url = reverse("notes-list-create")
    payload = {
        "customer": other_customer.id,
        "note": "Should fail",
    }
    response = regular_client.post(url, payload, format="json")

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert not Notes.objects.filter(note="Should fail").exists()


@pytest.mark.django_db
def test_admin_can_update_note(
    admin_client, admin_user, customer_assigned, regular_user
):
    note = Notes.objects.create(
        customer=customer_assigned,
        created_by=regular_user,
        note="Needs update",
    )

    url = reverse("notes-detail-update-destroy", args=[note.id])
    response = admin_client.patch(url, {"note": "Admin updated"}, format="json")

    assert response.status_code == status.HTTP_200_OK
    note.refresh_from_db()
    assert note.note == "Admin updated"
    assert note.updated_by == admin_user
