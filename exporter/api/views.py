from django.db.models import Count, Max
from django.db import transaction
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authenticate import CustomAuthentication
from common.pagination import CustomPagination
from exporter.api.serializers import (
    ExportDeleteSerializer,
    ExportHistoryQuerySerializer,
    ExportHistorySerializer,
    ExportRequestSerializer,
)
from exporter.models import ExportJob
from exporter.services.export_service import ExportService
from exporter.tasks import queue_export_delivery


class ExportView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    authentication_classes = [CustomAuthentication]
    pagination_class = CustomPagination

    @property
    def paginator(self):
        if not hasattr(self, "_paginator"):
            self._paginator = self.pagination_class()
            self._paginator.page_size = 20
        return self._paginator

    def get(self, request, *args, **kwargs):
        serializer = ExportHistoryQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        queryset = ExportJob.objects.select_related(
            "created_by",
            "email_log",
            "email_log__created_by",
        ).order_by("-created_at")

        model_name = serializer.validated_data.get("model")
        date_from = serializer.validated_data.get("date_from")
        date_to = serializer.validated_data.get("date_to")

        if model_name:
            queryset = queryset.filter(model_name=model_name)
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        page = self.paginator.paginate_queryset(queryset, request, view=self)
        response_payload = ExportHistorySerializer(page, many=True).data
        return self.paginator.get_paginated_response(response_payload)

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
            "relative_path": request.data.get("relative_path")
            or request.query_params.get("relative_path"),
        }
        serializer = ExportDeleteSerializer(data=payload)
        serializer.is_valid(raise_exception=True)

        deleted = ExportService().delete_export(
            relative_path=serializer.validated_data.get("relative_path"),
        )

        if not deleted:
            raise NotFound({"detail": "Export file not found."})

        return Response(
            {"message": "Export file deleted successfully."},
            status=status.HTTP_200_OK,
        )


class ExportHistoryMetaView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    authentication_classes = [CustomAuthentication]

    def get(self, request, *args, **kwargs):
        aggregates = ExportJob.objects.aggregate(
            count=Count("id"),
            latest_updated_at=Max("updated_at"),
        )
        latest_updated_at = aggregates["latest_updated_at"]

        return Response(
            {
                "count": aggregates["count"] or 0,
                "latest_updated_at": (
                    latest_updated_at.isoformat() if latest_updated_at else None
                ),
            },
            status=status.HTTP_200_OK,
        )
