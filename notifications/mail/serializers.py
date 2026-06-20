from rest_framework import serializers

from notifications.mail.models import EmailLog, MailConfiguration

from .contracts import MailConfigurationInput


class MailConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MailConfiguration
        fields = [
            "id",
            "name",
            "backend_type",
            "host",
            "port",
            "use_tls",
            "use_ssl",
            "default_from_email",
            "is_active",
            "last_test_status",
            "last_test_at",
            "last_test_recipient",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class BaseMailConfigurationInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, required=False, default="Default SMTP")
    host = serializers.CharField(max_length=255)
    port = serializers.IntegerField(min_value=1, max_value=65535)
    host_user = serializers.CharField(max_length=255)
    host_password = serializers.CharField(max_length=255, write_only=True)
    default_from_email = serializers.EmailField()
    use_tls = serializers.BooleanField(default=True)
    use_ssl = serializers.BooleanField(default=False)

    def validate(self, attrs):
        if attrs["use_tls"] and attrs["use_ssl"]:
            raise serializers.ValidationError(
                {"use_ssl": ["TLS ve SSL aynı anda aktif olamaz."]}
            )
        return attrs

    def to_configuration_input(self) -> MailConfigurationInput:
        if not hasattr(self, "validated_data"):
            raise AssertionError("Serializer must be validated before building input.")

        return MailConfigurationInput(
            host=self.validated_data["host"],
            port=self.validated_data["port"],
            host_user=self.validated_data["host_user"],
            host_password=self.validated_data["host_password"],
            default_from_email=self.validated_data["default_from_email"],
            use_tls=self.validated_data["use_tls"],
            use_ssl=self.validated_data["use_ssl"],
            name=self.validated_data["name"],
        )


class MailConfigurationTestSerializer(BaseMailConfigurationInputSerializer):
    test_recipient_email = serializers.EmailField(required=False)


class MailConfigurationSaveSerializer(BaseMailConfigurationInputSerializer):
    test_session_id = serializers.IntegerField(min_value=1)


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
    mail_configuration = serializers.CharField(
        source="mail_configuration.name",
        read_only=True,
    )

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
            "delivery_type",
            "metadata",
            "error_message",
            "sent_at",
            "mail_configuration",
            "created_by",
            "created_at",
            "updated_at",
        ]
