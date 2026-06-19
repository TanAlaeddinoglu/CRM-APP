from rest_framework import serializers


class NotificationTypeSerializer(serializers.Serializer):
    key = serializers.CharField()
    label = serializers.CharField()
    app_label = serializers.CharField()
    default_channels = serializers.ListField(child=serializers.CharField())
    default_title_template = serializers.CharField()
    default_body_template = serializers.CharField()
