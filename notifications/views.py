import json

from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.renderers import BrowsableAPIRenderer, JSONRenderer
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from accounts.authenticate import CustomAuthentication
from .exceptions import EmailDeliveryError
from .serializers import EmailLogSerializer, SendEmailSerializer
from .services import send_email_notification


class SendEmailView(generics.GenericAPIView):
    authentication_classes = [JWTAuthentication, CustomAuthentication]
    permission_classes = [IsAuthenticated]
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
            )
            response_status = status.HTTP_201_CREATED
            response_payload = EmailLogSerializer(email_log).data
        except EmailDeliveryError as exc:
            response_status = status.HTTP_202_ACCEPTED
            response_payload = {
                "message": "Email delivery could not be completed. The issue was logged for follow-up.",
                "email_log": EmailLogSerializer(exc.email_log).data,
            }

        return Response(
            response_payload,
            status=response_status,
        )
