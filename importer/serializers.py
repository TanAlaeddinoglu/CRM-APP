from __future__ import annotations

from rest_framework import serializers


class ImportColumnsSerializer(serializers.Serializer):
    """Request body for POST /api/importer/columns/."""

    model_key = serializers.CharField()
    source_type = serializers.ChoiceField(choices=["excel", "csv", "webhook"])
    file = serializers.FileField(required=False, allow_null=True)
    rows = serializers.ListField(
        child=serializers.DictField(), required=False, allow_null=True
    )

    def validate(self, attrs):
        source_type = attrs.get("source_type")
        if source_type in ("excel", "csv") and not attrs.get("file"):
            raise serializers.ValidationError(
                {"file": "Excel/CSV import için dosya zorunludur."}
            )
        if source_type == "webhook" and not attrs.get("rows"):
            raise serializers.ValidationError(
                {"rows": "Webhook import için rows zorunludur."}
            )
        return attrs


class ImportPreviewSerializer(serializers.Serializer):
    """Request body for POST /api/importer/preview/."""

    model_key = serializers.CharField()
    source_type = serializers.ChoiceField(choices=["excel", "csv", "webhook"])
    file = serializers.FileField(required=False, allow_null=True)
    rows = serializers.ListField(
        child=serializers.DictField(), required=False, allow_null=True
    )
    mapping = serializers.DictField(
        child=serializers.CharField(), required=False, allow_null=True
    )

    def validate(self, attrs):
        source_type = attrs.get("source_type")
        if source_type in ("excel", "csv") and not attrs.get("file"):
            raise serializers.ValidationError(
                {"file": "Excel/CSV import için dosya zorunludur."}
            )
        if source_type == "webhook" and not attrs.get("rows"):
            raise serializers.ValidationError(
                {"rows": "Webhook import için rows zorunludur."}
            )
        return attrs


class ImportStartSerializer(serializers.Serializer):
    """Request body for POST /api/importer/start/."""

    job_id = serializers.IntegerField()
    rows = serializers.ListField(
        child=serializers.DictField(), required=False, allow_null=True
    )
