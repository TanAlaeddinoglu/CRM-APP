from __future__ import annotations

import json

from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.renderers import BrowsableAPIRenderer, JSONRenderer
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from accounts.authenticate import CustomAuthentication
from notifications.exceptions import EmailDeliveryError
from notifications.models import EmailLog

from .services import (
    send_email_notification,
    delete_mail_configuration,
    get_active_mail_configuration,
    save_mail_configuration,
    test_mail_configuration,
)
from .serializers import (
    EmailLogSerializer,
    MailConfigurationSaveSerializer,
    MailConfigurationSerializer,
    MailConfigurationTestSerializer,
    SendEmailSerializer,
)


class SendEmailView(generics.GenericAPIView):
    authentication_classes = [JWTAuthentication, CustomAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    renderer_classes = [JSONRenderer, BrowsableAPIRenderer]
    serializer_class = SendEmailSerializer

    def _get_request_payload(self, request):
        data = request.data.copy()
        metadata = data.get("metadata", "")
        if isinstance(metadata, str) and metadata.strip():
            try:
                json.loads(metadata)
            except json.JSONDecodeError as exc:
                raise ValidationError(
                    {"metadata": ["Value must be valid JSON."]}
                ) from exc
        data.pop("metadata", None)

        attachments = request.FILES.getlist("attachments")
        if hasattr(data, "setlist"):
            data.setlist("attachments", attachments)
        else:
            data["attachments"] = attachments
        return data

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=self._get_request_payload(request))
        serializer.is_valid(raise_exception=True)

        try:
            email_log = send_email_notification(
                subject=serializer.validated_data["subject"],
                body=serializer.validated_data["body"],
                to_emails=serializer.validated_data["to_emails"],
                cc_emails=serializer.validated_data.get("cc_emails", []),
                bcc_emails=serializer.validated_data.get("bcc_emails", []),
                from_email=serializer.validated_data.get("from_email"),
                attachments=serializer.validated_data.get("attachments", []),
                created_by=request.user,
                delivery_type=EmailLog.DeliveryType.MANUAL,
            )
            response_status = status.HTTP_201_CREATED
            response_payload = EmailLogSerializer(email_log).data
        except EmailDeliveryError as exc:
            response_status = exc.status_code
            response_payload = {
                "message": exc.user_message,
                "email_log": EmailLogSerializer(exc.email_log).data,
            }

        return Response(response_payload, status=response_status)


class MailConfigurationView(generics.GenericAPIView):
    authentication_classes = [JWTAuthentication, CustomAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    renderer_classes = [JSONRenderer, BrowsableAPIRenderer]
    serializer_class = MailConfigurationSerializer

    def get(self, request, *args, **kwargs):
        mail_configuration = get_active_mail_configuration()
        return Response(
            {
                "configuration": MailConfigurationSerializer(mail_configuration).data
                if mail_configuration
                else None
            }
        )

    def put(self, request, *args, **kwargs):
        serializer = MailConfigurationSaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        config = serializer.to_configuration_input()
        try:
            mail_configuration = save_mail_configuration(
                config=config,
                test_session_id=serializer.validated_data["test_session_id"],
                actor=request.user,
            )
        except ValidationError:
            raise
        except Exception as exc:
            raise ValidationError(
                {"detail": f"Mail configuration could not be saved: {exc}"}
            ) from exc
        return Response(
            {
                "configuration": MailConfigurationSerializer(mail_configuration).data,
                "message": "Mail configuration saved successfully.",
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, *args, **kwargs):
        try:
            delete_mail_configuration()
        except Exception as exc:
            raise ValidationError(
                {"detail": f"Mail configuration could not be deleted: {exc}"}
            ) from exc
        return Response(
            {"message": "Mail configuration reset successfully."},
            status=status.HTTP_200_OK,
        )


class MailConfigurationTestView(generics.GenericAPIView):
    authentication_classes = [JWTAuthentication, CustomAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    renderer_classes = [JSONRenderer, BrowsableAPIRenderer]
    serializer_class = MailConfigurationTestSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        recipient_email = serializer.validated_data.get("test_recipient_email")
        if not recipient_email:
            recipient_email = getattr(request.user, "email", "") or ""
        if not recipient_email:
            raise ValidationError(
                {"test_recipient_email": ["A valid recipient email is required."]}
            )

        config = serializer.to_configuration_input()
        test_session, email_log = test_mail_configuration(
            config=config,
            tested_by=request.user,
            recipient_email=recipient_email,
        )
        return Response(
            {
                "message": "Mail configuration test completed successfully.",
                "test_session_id": test_session.id,
                "email_log": EmailLogSerializer(email_log).data,
            },
            status=status.HTTP_200_OK,
        )
