from unittest.mock import MagicMock, patch

import pytest

from customer.importers.customer_importer import CustomerImporter


@pytest.mark.django_db
def test_import_rows_calls_customer_service_bulk_create(admin_user):
    """
    CustomerImporter.import_rows() must delegate to CustomerService.bulk_create()
    and must NOT call Customer.objects.create() or bulk_create() directly.
    """
    rows = [
        {
            "customer_name": "Ali",
            "customer_phone": "905551234567",
            "source": "excel",
            "_status": "ok",
        }
    ]

    importer = CustomerImporter(actor=admin_user, job=None)

    with patch(
        "customer.services.CustomerService.bulk_create",
        return_value={"created_count": 1},
    ) as mock_bulk_create:
        result = importer.import_rows(rows)

    mock_bulk_create.assert_called_once()
    call_args = mock_bulk_create.call_args
    payload = call_args[0][0]

    # _meta keys must be stripped before passing to CustomerService
    assert all(not k.startswith("_") for row in payload for k in row.keys())
    assert result["success_count"] == 1


@pytest.mark.django_db
def test_import_rows_does_not_call_customer_objects_directly(admin_user):
    """
    Customer.objects.create() and Customer.objects.bulk_create() must never
    be called from customer_importer.import_rows().
    """
    rows = [
        {
            "customer_name": "Veli",
            "customer_phone": "905559999999",
            "source": "excel",
            "_status": "ok",
        }
    ]

    importer = CustomerImporter(actor=admin_user, job=None)

    with (
        patch(
            "customer.services.CustomerService.bulk_create",
            return_value={"created_count": 1},
        ),
        patch("customer.models.Customer.objects") as mock_customer_objects,
    ):
        importer.import_rows(rows)

    mock_customer_objects.create.assert_not_called()
    mock_customer_objects.bulk_create.assert_not_called()


@pytest.mark.django_db
def test_preview_returns_expected_keys(admin_user):
    rows = [
        {
            "customer_name": "Test",
            "customer_phone": "905550000001",
            "source": "excel",
        }
    ]

    importer = CustomerImporter(actor=admin_user)
    result = importer.preview(rows)

    assert "valid_count" in result
    assert "invalid_count" in result
    assert "duplicate_count" in result
    assert "total" in result
    assert "rows" in result
    assert "valid_rows" in result
