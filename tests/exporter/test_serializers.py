import pytest

from exporter.api.serializers import (
    ExportDeleteSerializer,
    ExportHistoryQuerySerializer,
    ExportRequestSerializer,
)

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# ExportRequestSerializer
# ---------------------------------------------------------------------------

class TestExportRequestSerializer:
    def test_valid_csv_request_with_default_fields(self):
        data = {"model": "customer", "file_type": "csv"}
        serializer = ExportRequestSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["model"] == "customer"
        assert len(serializer.validated_data["fields"]) > 0

    def test_valid_excel_request_with_explicit_fields(self):
        data = {
            "model": "customer",
            "file_type": "excel",
            "fields": ["customer_name", "customer_phone"],
        }
        serializer = ExportRequestSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["fields"] == ["customer_name", "customer_phone"]

    def test_unknown_model_fails_validation(self):
        data = {"model": "nonexistent_xyz", "file_type": "csv"}
        serializer = ExportRequestSerializer(data=data)
        assert not serializer.is_valid()
        assert "model" in serializer.errors

    def test_unsupported_file_type_fails_validation(self):
        data = {"model": "customer", "file_type": "pdf"}
        serializer = ExportRequestSerializer(data=data)
        assert not serializer.is_valid()
        assert "file_type" in serializer.errors

    def test_unknown_fields_fail_validation(self):
        data = {
            "model": "customer",
            "file_type": "csv",
            "fields": ["nonexistent_field"],
        }
        serializer = ExportRequestSerializer(data=data)
        assert not serializer.is_valid()
        assert "fields" in serializer.errors

    def test_empty_fields_list_uses_registry_defaults(self):
        data = {"model": "customer", "file_type": "csv", "fields": []}
        serializer = ExportRequestSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert len(serializer.validated_data["fields"]) > 0

    def test_optional_recipient_email_is_accepted(self):
        data = {
            "model": "customer",
            "file_type": "csv",
            "recipient_email": "test@example.com",
        }
        serializer = ExportRequestSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["recipient_email"] == "test@example.com"

    def test_invalid_recipient_email_fails_validation(self):
        data = {
            "model": "customer",
            "file_type": "csv",
            "recipient_email": "not-an-email",
        }
        serializer = ExportRequestSerializer(data=data)
        assert not serializer.is_valid()
        assert "recipient_email" in serializer.errors


# ---------------------------------------------------------------------------
# ExportDeleteSerializer
# ---------------------------------------------------------------------------

class TestExportDeleteSerializer:
    def test_valid_relative_path_passes(self):
        data = {"relative_path": "exports/customer/file.csv"}
        serializer = ExportDeleteSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_missing_relative_path_fails(self):
        serializer = ExportDeleteSerializer(data={})
        assert not serializer.is_valid()
        assert "relative_path" in serializer.errors

    def test_empty_relative_path_fails(self):
        data = {"relative_path": ""}
        serializer = ExportDeleteSerializer(data=data)
        assert not serializer.is_valid()


# ---------------------------------------------------------------------------
# ExportHistoryQuerySerializer
# ---------------------------------------------------------------------------

class TestExportHistoryQuerySerializer:
    def test_empty_params_are_valid(self):
        serializer = ExportHistoryQuerySerializer(data={})
        assert serializer.is_valid(), serializer.errors

    def test_valid_model_filter(self):
        serializer = ExportHistoryQuerySerializer(data={"model": "customer"})
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["model"] == "customer"

    def test_blank_model_is_accepted(self):
        serializer = ExportHistoryQuerySerializer(data={"model": ""})
        assert serializer.is_valid(), serializer.errors

    def test_unknown_model_fails_validation(self):
        serializer = ExportHistoryQuerySerializer(data={"model": "nonexistent_xyz"})
        assert not serializer.is_valid()
        assert "model" in serializer.errors

    def test_valid_date_range_passes(self):
        data = {"date_from": "2026-01-01", "date_to": "2026-01-31"}
        serializer = ExportHistoryQuerySerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_same_date_range_is_valid(self):
        data = {"date_from": "2026-06-01", "date_to": "2026-06-01"}
        serializer = ExportHistoryQuerySerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_date_from_greater_than_date_to_fails(self):
        data = {"date_from": "2026-06-15", "date_to": "2026-06-01"}
        serializer = ExportHistoryQuerySerializer(data=data)
        assert not serializer.is_valid()
        assert "date_to" in serializer.errors

    def test_invalid_date_format_fails(self):
        data = {"date_from": "01/06/2026"}
        serializer = ExportHistoryQuerySerializer(data=data)
        assert not serializer.is_valid()
        assert "date_from" in serializer.errors
