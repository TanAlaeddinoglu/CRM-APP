import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status

from customer.models import Customer, Tag, CustomerTagHistory
from common.utils import DEFAULT_TAG_ID

User = get_user_model()


def _extract_results(data):
    if isinstance(data, dict) and "results" in data:
        return data["results"]
    return data


@pytest.mark.django_db
def test_admin_list_supports_search_filter(admin_client, admin_user):
    assignee = User.objects.create_user(
        username="assignee",
        email="assignee@example.com",
        password="test-pass-123",
    )
    Customer.objects.create(
        customer_name="Alice",
        customer_surname="Smith",
        customer_email="alice@example.com",
        customer_phone="11111111111",
        assigned_to=assignee,
        created_by=admin_user,
    )
    Customer.objects.create(
        customer_name="Bob",
        customer_surname="Jones",
        customer_email="bob@example.com",
        customer_phone="22222222222",
        assigned_to=assignee,
        created_by=admin_user,
    )

    url = reverse("customer-list-create")
    response = admin_client.get(url, {"search": "alice"})

    assert response.status_code == status.HTTP_200_OK
    payload = _extract_results(response.data)
    assert len(payload) == 1
    assert payload[0]["customer_name"] == "Alice"


@pytest.mark.django_db
def test_admin_list_allows_status_filter(admin_client, admin_user):
    assignee = User.objects.create_user(
        username="assignee-status",
        email="assignee-status@example.com",
        password="test-pass-123",
    )
    Customer.objects.create(
        customer_name="Carl",
        customer_surname="Active",
        customer_email="carl@example.com",
        customer_phone="33333333333",
        status="active",
        assigned_to=assignee,
        created_by=admin_user,
    )
    Customer.objects.create(
        customer_name="Diana",
        customer_surname="Archived",
        customer_email="diana@example.com",
        customer_phone="44444444444",
        status="archived",
        assigned_to=assignee,
        created_by=admin_user,
    )

    url = reverse("customer-list-create")
    response = admin_client.get(url, {"status": "active"})

    assert response.status_code == status.HTTP_200_OK
    payload = _extract_results(response.data)
    assert len(payload) == 1
    assert payload[0]["customer_name"] == "Carl"


# @pytest.mark.django_db
# def test_admin_retrieve_includes_tag_history(admin_client, admin_user):
#     assignee = User.objects.create_user(
#         username="history-user",
#         email="history-user@example.com",
#         password="test-pass-123",
#     )
#     tag = Tag.objects.create(tag_name="VIP")
#     customer = Customer.objects.create(
#         customer_name="Eva",
#         customer_surname="History",
#         customer_email="eva@example.com",
#         customer_phone="55555555555",
#         assigned_to=assignee,
#         created_by=admin_user,
#     )
#     CustomerTagHistory.objects.create(
#         customer=customer,
#         from_tag=None,
#         to_tag=tag,
#         changed_by=admin_user,
#     )
#
#     url = reverse("customer-detail-update-destroy", args=[customer.pk])
#     response = admin_client.get(url)
#
#     assert response.status_code == status.HTTP_200_OK
#     payload = response.data
#     assert payload["customer"]["id"] == customer.id
#     assert payload["customer"]["customer_name"] == "Eva"
#     assert len(payload["tag_history"]) == 1
#     history_entry = payload["tag_history"][0]
#     assert history_entry["customer"] == customer.id
#     assert history_entry["to_tag"] == tag.id


@pytest.mark.django_db
def test_admin_list_denied_for_regular_user(regular_client):
    url = reverse("customer-list-create")
    response = regular_client.get(url)
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_user_list_returns_only_active_assignments(regular_client, regular_user, admin_user):
    other_user = User.objects.create_user(
        username="someone-else",
        email="someone-else@example.com",
        password="test-pass-123",
    )
    assigned_active = Customer.objects.create(
        customer_name="Active",
        customer_surname="Assigned",
        customer_email="active@example.com",
        customer_phone="66666666666",
        status="active",
        assigned_to=regular_user,
        created_by=admin_user,
    )
    Customer.objects.create(
        customer_name="Inactive",
        customer_surname="Assigned",
        customer_email="inactive@example.com",
        customer_phone="77777777777",
        status="archived",
        assigned_to=regular_user,
        created_by=admin_user,
    )
    Customer.objects.create(
        customer_name="Active",
        customer_surname="Unassigned",
        customer_email="unassigned@example.com",
        customer_phone="88888888888",
        status="active",
        assigned_to=other_user,
        created_by=admin_user,
    )

    url = reverse("customer-assigned-to-user")
    response = regular_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    payload = _extract_results(response.data)
    assert [record["id"] for record in payload] == [assigned_active.id]


@pytest.mark.django_db
def test_user_retrieve_assigned_customer(regular_client, regular_user, admin_user):
    customer = Customer.objects.create(
        customer_name="Grace",
        customer_surname="Owned",
        customer_email="grace@example.com",
        customer_phone="99999999999",
        assigned_to=regular_user,
        created_by=admin_user,
    )

    url = reverse("customer-detail-update-to-assigned-user", args=[customer.pk])
    response = regular_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["id"] == customer.id


@pytest.mark.django_db
def test_user_retrieve_denied_for_unassigned_customer(regular_client, regular_user, admin_user):
    other_user = User.objects.create_user(
        username="another-user",
        email="another-user@example.com",
        password="test-pass-123",
    )
    customer = Customer.objects.create(
        customer_name="Henry",
        customer_surname="Foreign",
        customer_email="henry@example.com",
        customer_phone="10101010101",
        assigned_to=other_user,
        created_by=admin_user,
    )

    url = reverse("customer-detail-update-to-assigned-user", args=[customer.pk])
    response = regular_client.get(url)

    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_user_retrieve_allows_admin_access(admin_client, admin_user, regular_user):
    customer = Customer.objects.create(
        customer_name="Ivy",
        customer_surname="AdminView",
        customer_email="ivy@example.com",
        customer_phone="12121212121",
        assigned_to=regular_user,
        created_by=admin_user,
    )

    url = reverse("customer-detail-update-to-assigned-user", args=[customer.pk])
    response = admin_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["id"] == customer.id


@pytest.mark.django_db
def test_user_partial_update_allows_tag_change_for_assigned_user(regular_client, regular_user, admin_user):
    customer = Customer.objects.create(
        customer_name="Jack",
        customer_surname="Taggable",
        customer_email="jack@example.com",
        customer_phone="13131313131",
        assigned_to=regular_user,
        created_by=admin_user,
    )
    tag = Tag.objects.create(tag_name="Hot Lead")

    url = reverse("customer-detail-update-to-assigned-user", args=[customer.pk])
    response = regular_client.patch(url, {"tag": tag.pk}, format="json")

    assert response.status_code == status.HTTP_200_OK
    customer.refresh_from_db()
    assert customer.tag_id == tag.id


@pytest.mark.django_db
def test_user_partial_update_clearing_tag_unassigns_customer(regular_client, regular_user, admin_user):
    tag = Tag.objects.create(tag_name="Follow Up")
    customer = Customer.objects.create(
        customer_name="Jill",
        customer_surname="Tagged",
        customer_email="jill@example.com",
        customer_phone="17171717171",
        assigned_to=regular_user,
        created_by=admin_user,
        tag=tag,
    )

    url = reverse("customer-detail-update-to-assigned-user", args=[customer.pk])
    response = regular_client.patch(url, {"tag": None}, format="json")

    assert response.status_code == status.HTTP_200_OK
    customer.refresh_from_db()
    assert customer.tag is None
    assert customer.assigned_to is None


@pytest.mark.django_db
def test_admin_update_clearing_tag_unassigns_customer(admin_client, admin_user, regular_user, customer):
    tag = Tag.objects.create(tag_name="Pipeline")
    customer = Customer.objects.create(
        customer_name="Morgan",
        customer_surname="AdminClear",
        customer_email="morgan@example.com",
        customer_phone="18181818181",
        assigned_to=regular_user,
        created_by=admin_user,
        tag=tag,
    )

    url = reverse("customer-detail-update-destroy", args=[customer.pk])
    response = admin_client.patch(url, {"tag": None}, format="json")

    assert response.status_code == status.HTTP_200_OK
    customer.refresh_from_db()
    assert customer.tag is None
    assert customer.assigned_to is None


@pytest.mark.django_db
def test_admin_setting_tag_assigns_customer(admin_client, admin_user):
    customer = Customer.objects.create(
        customer_name="Nina",
        customer_surname="Pool",
        customer_email="nina@example.com",
        customer_phone="19191919191",
        created_by=admin_user,
    )
    tag = Tag.objects.create(tag_name="New Lead")

    url = reverse("customer-detail-update-destroy", args=[customer.pk])
    response = admin_client.patch(url, {"tag": tag.pk}, format="json")

    assert response.status_code == status.HTTP_200_OK
    customer.refresh_from_db()
    assert customer.tag_id == tag.id
    assert customer.assigned_to_id == admin_user.id


@pytest.mark.django_db
def test_admin_assigning_without_tag_sets_default(admin_client, admin_user):
    Tag.objects.update_or_create(
        pk=DEFAULT_TAG_ID,
        defaults={"tag_name": "Default Tag", "color": "#FF0000", "description": "Auto assign"},
    )
    customer = Customer.objects.create(
        customer_name="Oliver",
        customer_surname="Claimed",
        customer_email="oliver@example.com",
        customer_phone="20202020202",
        created_by=admin_user,
    )

    url = reverse("customer-detail-update-destroy", args=[customer.pk])
    payload = {"assigned_to": admin_user.id}
    response = admin_client.patch(url, payload, format="json")

    assert response.status_code == status.HTTP_200_OK
    customer.refresh_from_db()
    assert customer.assigned_to_id == admin_user.id
    assert customer.tag_id == DEFAULT_TAG_ID


@pytest.mark.django_db
def test_user_partial_update_blocks_other_fields(regular_client, regular_user, admin_user):
    customer = Customer.objects.create(
        customer_name="Kate",
        customer_surname="Protected",
        customer_email="kate@example.com",
        customer_phone="14141414141",
        assigned_to=regular_user,
        created_by=admin_user,
    )

    url = reverse("customer-detail-update-to-assigned-user", args=[customer.pk])
    response = regular_client.patch(url, {"customer_name": "Changed"}, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    customer.refresh_from_db()
    assert customer.customer_name == "Kate"


@pytest.mark.django_db
def test_user_partial_update_denied_for_unassigned_user(regular_client, regular_user, admin_user):
    other_user = User.objects.create_user(
        username="unassigned-user",
        email="unassigned@example.com",
        password="test-pass-123",
    )
    customer = Customer.objects.create(
        customer_name="Liam",
        customer_surname="NoAccess",
        customer_email="liam@example.com",
        customer_phone="15151515151",
        assigned_to=other_user,
        created_by=admin_user,
    )
    tag = Tag.objects.create(tag_name="Cold")

    url = reverse("customer-detail-update-to-assigned-user", args=[customer.pk])
    response = regular_client.patch(url, {"tag": tag.pk}, format="json")

    assert response.status_code == status.HTTP_404_NOT_FOUND
    customer.refresh_from_db()
    assert customer.tag is None


@pytest.mark.django_db
def test_tag_history_by_customer_returns_records_for_assigned_user(regular_client, regular_user, admin_user):
    customer = Customer.objects.create(
        customer_name="Morgan",
        customer_surname="History",
        customer_email="morgan@example.com",
        customer_phone="16161616161",
        assigned_to=regular_user,
        created_by=admin_user,
    )
    tag = Tag.objects.create(tag_name="Premium")
    CustomerTagHistory.objects.create(
        customer=customer,
        from_tag=None,
        to_tag=tag,
        changed_by=admin_user,
    )

    url = reverse("tag-history-by-customer")
    response = regular_client.get(url, {"customer_id": customer.pk})

    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 1
    assert response.data[0]["customer"] == customer.id


@pytest.mark.django_db
def test_tag_history_by_customer_requires_customer_id(admin_client):
    url = reverse("tag-history-by-customer")
    response = admin_client.get(url)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
#
# @pytest.mark.django_db
# def test_admin_list_returns_empty_results_for_out_of_range_offset(admin_client, admin_user, settings):
#     settings.REST_FRAMEWORK = {
#         **getattr(settings, "REST_FRAMEWORK", {}),
#         "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.LimitOffsetPagination",
#         "PAGE_SIZE": 2,
#     }
#
#     assignee = User.objects.create_user(
#         username="paginated-assignee",
#         email="paginated-assignee@example.com",
#         password="test-pass-123",
#     )
#     for index in range(3):
#         Customer.objects.create(
#             customer_name=f"Paged-{index}",
#             customer_surname="Example",
#             customer_email=f"paged{index}@example.com",
#             customer_phone=f"55500000{index}",
#             assigned_to=assignee,
#             created_by=admin_user,
#         )
#
#     url = reverse("customer-list-create")
#     response = admin_client.get(url, {"limit": 2, "offset": 10})
#
#     assert response.status_code == status.HTTP_200_OK
#     assert response.data["count"] == 3
#     assert response.data["results"] == []
