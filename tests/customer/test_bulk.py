import io
import pytest
import pandas as pd
from django.core.files.uploadedfile import SimpleUploadedFile

from customer.bulkSerilaizer import CustomerExcelImportSerializer, normalize_phone
from customer.models import Customer

pytestmark = pytest.mark.django_db


def _make_excel(rows):
    df = pd.DataFrame(rows)
    buffer = io.BytesIO()
    df.to_excel(buffer, index=False)
    buffer.seek(0)
    return SimpleUploadedFile(
        "customers.xlsx",
        buffer.read(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


def test_normalize_phone():
    assert normalize_phone("+90 123-456-7890") == "901234567890"
    assert normalize_phone("1234567890") == "1234567890"
    assert normalize_phone("abc") is None


def test_customer_excel_import_serializer_reports_duplicates_and_invalid():
    rows = [
        {"Ad": "A", "Soyad": "One", "Telefon": "1234567890", "Email": "a@example.com"},
        {"Ad": "B", "Soyad": "Two", "Telefon": "1234567890", "Email": "b@example.com"},
        {"Ad": "C", "Soyad": "Three", "Telefon": "invalid", "Email": "c@example.com"},
    ]
    upload = _make_excel(rows)

    serializer = CustomerExcelImportSerializer(data={"file": upload})
    assert serializer.is_valid(), serializer.errors
    result = serializer.save()

    assert result["created"] == 1
    assert result["duplicates_in_file"] == 1
    assert result["invalid_phone"] == 1
    assert Customer.objects.count() == 1
