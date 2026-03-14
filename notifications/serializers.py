from rest_framework import serializers

from .models import EmailLog


class SendEmailSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=255)
    body = serializers.CharField()
    to_email = serializers.EmailField(required=False, write_only=True)
    to_emails = serializers.ListField(
        child=serializers.EmailField(),
        allow_empty=False,
        required=False,
    )
    cc_email = serializers.EmailField(required=False, write_only=True)
    cc_emails = serializers.ListField(
        child=serializers.EmailField(),
        required=False,
        default=list,
    )
    bcc_email = serializers.EmailField(required=False, write_only=True)
    bcc_emails = serializers.ListField(
        child=serializers.EmailField(),
        required=False,
        default=list,
    )
    from_email = serializers.EmailField(required=False, allow_blank=True)
    attachment = serializers.FileField(required=False, write_only=True)
    attachments = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        default=list,
        write_only=True,
    )

    def validate(self, attrs):
        to_email = attrs.pop("to_email", None)
        cc_email = attrs.pop("cc_email", None)
        bcc_email = attrs.pop("bcc_email", None)
        attachment = attrs.pop("attachment", None)

        if to_email and not attrs.get("to_emails"):
            attrs["to_emails"] = [to_email]
        if cc_email and not attrs.get("cc_emails"):
            attrs["cc_emails"] = [cc_email]
        if bcc_email and not attrs.get("bcc_emails"):
            attrs["bcc_emails"] = [bcc_email]
        if attachment and not attrs.get("attachments"):
            attrs["attachments"] = [attachment]

        if not attrs.get("to_emails"):
            raise serializers.ValidationError(
                {"to_email": ["Provide at least one recipient email."]}
            )

        attrs.setdefault("cc_emails", [])
        attrs.setdefault("bcc_emails", [])
        attrs.setdefault("attachments", [])
        return attrs


class EmailLogSerializer(serializers.ModelSerializer):
    created_by = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = EmailLog
        fields = [
            "id",
            "subject",
            "body",
            "from_email",
            "to_emails",
            "cc_emails",
            "bcc_emails",
            "status",
            "metadata",
            "error_message",
            "sent_at",
            "created_by",
            "created_at",
            "updated_at",
        ]
