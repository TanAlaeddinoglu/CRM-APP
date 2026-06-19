from rest_framework import serializers

from notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    content_type_label = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "type_key",
            "title",
            "body",
            "context_payload",
            "content_type_label",
            "target_object_id",
            "is_read",
            "read_at",
            "created_at",
        ]
        read_only_fields = fields

    def get_content_type_label(self, obj):
        if obj.target_content_type_id:
            return obj.target_content_type.model
        return None
