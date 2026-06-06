from rest_framework import serializers

from exporter.exportFactory.factory import ExporterFactory
from exporter.registry.base_registry import ExportRegistry
from exporter.models import ExportJob


class ExportRequestSerializer(serializers.Serializer):
    model = serializers.CharField()
    fields = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
    )
    file_type = serializers.ChoiceField(choices=ExporterFactory.supported_types())
    recipient_email = serializers.EmailField(required=False)
    email_subject = serializers.CharField(required=False, allow_blank=True)
    email_body = serializers.CharField(required=False, allow_blank=True)

    def validate_model(self, value):
        try:
            return ExportRegistry.get(value).model_name
        except KeyError as exc:
            raise serializers.ValidationError("Unsupported model.") from exc

    def validate(self, attrs):
        registry = ExportRegistry.get(attrs["model"])
        fields = attrs.get("fields")
        try:
            attrs["fields"] = registry.resolve_fields(fields)
        except ValueError as exc:
            raise serializers.ValidationError({"fields": [str(exc)]}) from exc
        return attrs


class ExportDeleteSerializer(serializers.Serializer):
    relative_path = serializers.CharField()

    def validate(self, attrs):
        relative_path = attrs.get("relative_path")

        if not relative_path:
            raise serializers.ValidationError(
                {"relative_path": ["relative_path is required."]}
            )

        return attrs


class ExportHistoryQuerySerializer(serializers.Serializer):
    model = serializers.CharField(required=False, allow_blank=True)
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)

    def validate_model(self, value):
        if not value:
            return ""

        try:
            return ExportRegistry.get(value).model_name
        except KeyError as exc:
            raise serializers.ValidationError("Unsupported model.") from exc

    def validate(self, attrs):
        date_from = attrs.get("date_from")
        date_to = attrs.get("date_to")

        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError(
                {"date_to": ["date_to must be greater than or equal to date_from."]}
            )

        return attrs


class ExportHistorySerializer(serializers.ModelSerializer):
    created_by = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = ExportJob
        fields = [
            "id",
            "created_by",
            "model_name",
            "file_type",
            "selected_fields",
            "recipient_email",
            "email_subject",
            "status",
            "file_status",
            "email_status",
            "row_count",
            "file_name",
            "relative_path",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
