from __future__ import annotations

import json

from accounts.authenticate import CustomAuthentication
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from importer.exceptions import ImportJobError, ImportSourceError, ImporterNotFound
from importer.serializers import (
    ImportColumnsSerializer,
    ImportPreviewSerializer,
    ImportStartSerializer,
)
from importer.services import ImportService


class ImportColumnsView(APIView):
    """
    POST /api/importer/columns/

    Reads the uploaded file and returns raw column names, first 3 sample rows,
    the domain importer's suggested column mapping, and the list of target fields.
    Does NOT create an ImportJob.
    """

    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        ser = ImportColumnsSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        try:
            result = ImportService.get_columns(
                model_key=data["model_key"],
                source_type=data["source_type"],
                file=data.get("file"),
                rows=data.get("rows"),
            )
        except ImporterNotFound as exc:
            return Response({"detail": str(exc)}, status=400)
        except ImportSourceError as exc:
            return Response({"detail": str(exc)}, status=400)

        return Response(result, status=200)


class ImportPreviewView(APIView):
    """
    POST /api/importer/preview/

    Reads the uploaded file (or webhook rows), runs domain-specific preview,
    creates an ImportJob, and returns the preview data + job_id.

    Optional `mapping` field (JSON string in multipart or dict in JSON body)
    renames Excel columns to domain field names before preview runs.
    """

    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        # Parse mapping JSON string before building the serializer dict.
        # DRF's DictField calls html.parse_html_dict() when it receives a QueryDict,
        # which looks for keys shaped "mapping[key]=value" and silently returns {}
        # — so a pre-parsed dict assigned to a mutable QueryDict copy gets dropped.
        # Passing a plain dict bypasses that path entirely.
        raw_mapping = request.data.get("mapping")
        if isinstance(raw_mapping, str):
            try:
                mapping = json.loads(raw_mapping)
            except (json.JSONDecodeError, TypeError):
                mapping = None
        elif isinstance(raw_mapping, dict):
            mapping = raw_mapping
        else:
            mapping = None

        ser = ImportPreviewSerializer(data={
            "model_key": request.data.get("model_key"),
            "source_type": request.data.get("source_type"),
            "file": request.data.get("file"),
            "rows": request.data.get("rows"),
            "mapping": mapping,
        })
        ser.is_valid(raise_exception=True)
        validated = ser.validated_data

        try:
            result = ImportService.preview(
                model_key=validated["model_key"],
                source_type=validated["source_type"],
                actor=request.user,
                file=validated.get("file"),
                rows=validated.get("rows"),
                mapping=mapping or None,
            )
        except ImporterNotFound as exc:
            return Response({"detail": str(exc)}, status=400)
        except ImportSourceError as exc:
            return Response({"detail": str(exc)}, status=400)

        return Response(result, status=200)


class ImportStartView(APIView):
    """
    POST /api/importer/start/

    Starts the import for a previously previewed ImportJob.
    Accepts optional `rows` containing user-edited ok rows from the frontend.
    """

    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    parser_classes = [JSONParser]

    def post(self, request):
        ser = ImportStartSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        try:
            result = ImportService.start(
                job_id=data["job_id"],
                actor=request.user,
                rows=data.get("rows"),
            )
        except ImporterNotFound as exc:
            return Response({"detail": str(exc)}, status=400)
        except ImportJobError as exc:
            return Response({"detail": str(exc)}, status=400)

        return Response(result, status=200)
