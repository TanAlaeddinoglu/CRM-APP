from rest_framework import serializers

from exporter.exportFactory.factory import ExporterFactory
from exporter.registry.base_registry import ExportRegistry


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
    absolute_path = serializers.CharField(required=False)
    relative_path = serializers.CharField(required=False)

    def validate(self, attrs):
        absolute_path = attrs.get("absolute_path")
        relative_path = attrs.get("relative_path")

        if not absolute_path and not relative_path:
            raise serializers.ValidationError(
                "absolute_path or relative_path is required."
            )

        if absolute_path and relative_path:
            raise serializers.ValidationError(
                "Use either absolute_path or relative_path, not both."
            )

        return attrs
