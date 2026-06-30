from rest_framework import serializers


class NotificationTypeSerializer(serializers.Serializer):
    key = serializers.CharField()
    label = serializers.CharField()
    app_label = serializers.CharField()
    default_channels = serializers.ListField(child=serializers.CharField())
    default_title_template = serializers.CharField()
    default_body_template = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    variables = serializers.ListField(child=serializers.DictField(), default=list)
    # "general" = normal bildirim kanalında göster | "reminder" = zamanlayıcı bölümünde göster
    category = serializers.CharField(default="general")
