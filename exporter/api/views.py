from django.db import transaction
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authenticate import CustomAuthentication
from exporter.api.serializers import ExportDeleteSerializer, ExportRequestSerializer
from exporter.models import ExportJob
from exporter.services.export_service import ExportService
from exporter.tasks import queue_export_delivery


class ExportView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    authentication_classes = [CustomAuthentication]

    # TODO: file created ve email sent leri listelemek icin endpoint yazilacak
    # def get(self, request, *args, **kwargs):

    def post(self, request, *args, **kwargs):
        serializer = ExportRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        recipient_email = (
            serializer.validated_data.get("recipient_email") or request.user.email
        )
        if not recipient_email:
            raise ValidationError({"recipient_email": ["Recipient email is required."]})

        with transaction.atomic():
            job = ExportJob.objects.create(
                created_by=request.user,
                model_name=serializer.validated_data["model"],
                file_type=serializer.validated_data["file_type"],
                selected_fields=serializer.validated_data["fields"],
                recipient_email=recipient_email,
                email_subject=serializer.validated_data.get("email_subject", ""),
                email_body=serializer.validated_data.get("email_body", ""),
                metadata={"requested_fields": serializer.validated_data["fields"]},
            )

        try:
            async_result = queue_export_delivery(job_id=job.id)
        except Exception as exc:
            job.status = ExportJob.Status.FAILED
            job.error_message = str(exc)
            job.metadata = {**job.metadata, "queue_error": {"message": str(exc)}}
            job.save(
                update_fields=["status", "error_message", "metadata", "updated_at"]
            )
            raise

        job.workflow_task_id = async_result.id
        job.save(update_fields=["workflow_task_id", "updated_at"])

        return Response(
            {
                "message": "Export job queued successfully.",
                "task_id": async_result.id,
                "job_id": job.id,
                "model": serializer.validated_data["model"],
                "file_type": serializer.validated_data["file_type"],
                "fields": serializer.validated_data["fields"],
                "recipient_email": recipient_email,
            },
            status=status.HTTP_202_ACCEPTED,
        )

    def delete(self, request, *args, **kwargs):
        payload = {
            "absolute_path": request.data.get("absolute_path")
            or request.query_params.get("absolute_path"),
            "relative_path": request.data.get("relative_path")
            or request.query_params.get("relative_path"),
        }
        serializer = ExportDeleteSerializer(data=payload)
        serializer.is_valid(raise_exception=True)

        deleted = ExportService().delete_export(
            absolute_path=serializer.validated_data.get("absolute_path"),
            relative_path=serializer.validated_data.get("relative_path"),
        )

        if not deleted:
            raise NotFound({"detail": "Export file not found."})

        return Response(
            {"message": "Export file deleted successfully."},
            status=status.HTTP_200_OK,
        )
