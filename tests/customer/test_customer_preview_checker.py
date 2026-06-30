import pytest

from customer.importers.customer_preview import CustomerPreviewChecker


def _row(**kwargs):
    base = {
        "customer_name": "Ali",
        "customer_phone": "905551234567",
        "source": "excel",
    }
    base.update(kwargs)
    return base


@pytest.mark.django_db
def test_valid_row_goes_to_valid_rows():
    checker = CustomerPreviewChecker()
    result = checker.check([_row()])
    assert result.valid_count == 1
    assert result.invalid_count == 0
    assert result.duplicate_count == 0
    assert result.valid_rows[0]["_status"] == "ok"


@pytest.mark.django_db
def test_missing_customer_name_goes_to_invalid():
    checker = CustomerPreviewChecker()
    row = _row()
    row["customer_name"] = ""
    result = checker.check([row])
    assert result.invalid_count == 1
    assert result.valid_count == 0
    errors = result.invalid_rows[0]["_errors"]
    assert any(e["field"] == "customer_name" for e in errors)


@pytest.mark.django_db
def test_missing_phone_goes_to_invalid():
    checker = CustomerPreviewChecker()
    row = {"customer_name": "Ali", "source": "excel"}
    result = checker.check([row])
    assert result.invalid_count == 1


@pytest.mark.django_db
def test_file_duplicate_phone_goes_to_duplicate():
    checker = CustomerPreviewChecker()
    rows = [_row(), _row()]  # same phone twice
    result = checker.check(rows)
    assert result.valid_count == 1
    assert result.duplicate_count == 1
    dup = result.duplicate_rows[0]
    assert dup["_status"] == "duplicate_in_file"


@pytest.mark.django_db
def test_db_duplicate_goes_to_duplicate(admin_user):
    from customer.models import Customer

    existing = Customer.objects.create(
        customer_name="Existing",
        customer_phone="905551234567",
        created_by=admin_user,
        updated_by=admin_user,
    )

    checker = CustomerPreviewChecker()
    result = checker.check([_row(customer_phone="905551234567")])
    assert result.duplicate_count == 1
    assert result.valid_count == 0
    assert result.duplicate_rows[0]["_status"] == "duplicate_in_db"

    existing.delete()


@pytest.mark.django_db
def test_mixed_rows():
    checker = CustomerPreviewChecker()
    rows = [
        _row(customer_name="Ali", customer_phone="905551111111"),
        _row(customer_name="", customer_phone="905552222222"),    # invalid (no name)
        _row(customer_name="Mehmet", customer_phone="905551111111"),  # file dup
    ]
    result = checker.check(rows)
    assert result.valid_count == 1
    assert result.invalid_count == 1
    assert result.duplicate_count == 1
    assert result.total == 3
