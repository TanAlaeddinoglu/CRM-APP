from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.response import Response

from rest_framework.permissions import IsAuthenticated, IsAdminUser, SAFE_METHODS
from rest_framework.exceptions import ValidationError, NotFound
from rest_framework import status, viewsets, filters

from accounts.authenticate import CustomAuthentication
from common.pagination import CustomPagination
from .filters import CustomerFilter, TagHistoryFilter, NoteHistoryFilter
from .serializers import (
    CustomerSerializer,
    CustomerTagHistorySerializer,
    TagSerializer,
    NotesSerializer,
)
from .models import Customer, Tag, CustomerTagHistory, Notes
from .services import is_admin_or_assigned_to_user
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser


# customer/views.py (en alta ekleyebilirsin)
import pandas as pd
from django.db import transaction

from .bulkSerilaizer import CustomerExcelRowSerializer


EXCEL_COL_MAP = {
    # Excel başlıkların
    "Ad": "customer_name",
    "Soyad": "customer_surname",
    "Telefon": "customer_phone",
    "Email": "customer_email",
}


def _read_excel_to_rows(excel_file):
    df = pd.read_excel(excel_file)
    df = df.rename(columns=EXCEL_COL_MAP)

    required_cols = {"customer_name", "customer_surname", "customer_phone"}
    missing = required_cols - set(df.columns)
    if missing:
        return None, {"detail": f"Eksik kolon(lar): {sorted(missing)}"}

    # satır satır dict listesi
    rows = []
    for i, r in df.iterrows():
        excel_row_no = int(i) + 2  # header 1. satır varsayımı
        rows.append(
            {
                "row": excel_row_no,
                "customer_name": r.get("customer_name"),
                "customer_surname": r.get("customer_surname"),
                "customer_phone": r.get("customer_phone"),
                "customer_email": r.get("customer_email"),
            }
        )
    return rows, None


def _analyze_rows(rows):
    """
    - Row serializer ile validate
    - Dosya içi duplicate (phone)
    - DB duplicate (phone)
    Return: preview_rows, duplicates, errors, counts
    """
    errors = []
    duplicates = []

    # 1) validate + normalize
    validated = []
    for r in rows:
        row_no = r["row"]
        ser = CustomerExcelRowSerializer(data=r)
        if not ser.is_valid():
            errors.append({"row": row_no, "errors": ser.errors})
            continue

        data = ser.validated_data
        validated.append({"row": row_no, **data})

    # 2) duplicate in file
    seen = {}  # phone -> first_row
    file_unique = []
    for r in validated:
        phone = r["customer_phone"]
        if phone in seen:
            duplicates.append(
                {
                    "row": r["row"],
                    "customer_phone": phone,
                    "reason": "duplicate_in_file",
                    "first_seen_row": seen[phone],
                }
            )
            continue
        seen[phone] = r["row"]
        file_unique.append(r)

    # 3) duplicate in db (tek sorgu)
    phones = [r["customer_phone"] for r in file_unique]
    existing_map = dict(
        Customer.objects.filter(customer_phone__in=phones).values_list("customer_phone", "id")
    )

    preview_rows = []
    for r in file_unique:
        phone = r["customer_phone"]
        if phone in existing_map:
            duplicates.append(
                {
                    "row": r["row"],
                    "customer_phone": phone,
                    "reason": "duplicate_in_db",
                    "existing_customer_id": existing_map[phone],
                }
            )
            continue
        preview_rows.append(r)

    counts = {
        "total_rows": len(rows),
        "valid_rows": len(validated),
        "preview_rows": len(preview_rows),
        "duplicates_in_file": sum(1 for d in duplicates if d["reason"] == "duplicate_in_file"),
        "duplicates_in_db": sum(1 for d in duplicates if d["reason"] == "duplicate_in_db"),
        "errors": len(errors),
    }

    return preview_rows, duplicates, errors, counts


class CustomerExcelDryRunView(APIView):
    """
    POST /customers/import-excel/dry-run/
    multipart/form-data:
      file: excel

    DB'ye KAYDETMEZ. Preview + duplicate + errors döner.
    """
    parser_classes = [MultiPartParser, FormParser]
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, *args, **kwargs):
        excel_file = request.FILES.get("file")
        if not excel_file:
            return Response({"detail": "file alanı boş."}, status=status.HTTP_400_BAD_REQUEST)

        rows, err = _read_excel_to_rows(excel_file)
        if err:
            return Response(err, status=status.HTTP_400_BAD_REQUEST)

        preview_rows, duplicates, errors, counts = _analyze_rows(rows)

        return Response(
            {
                **counts,
                "preview": preview_rows,       # ✅ admin önizleme burada görecek
                "duplicates": duplicates,      # ✅ duplicate tespiti burada
                "row_errors": errors,          # ✅ validasyon hataları
            },
            status=status.HTTP_200_OK,
        )


class CustomerExcelUploadView(APIView):
    """
    POST /customers/import-excel/
    multipart/form-data:
      file: excel

    GERÇEK KAYIT. Yine aynı kontrolleri yapar, sadece preview_rows kadar create eder.
    """
    parser_classes = [MultiPartParser, FormParser]
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, *args, **kwargs):
        excel_file = request.FILES.get("file")
        if not excel_file:
            return Response({"detail": "file alanı boş."}, status=status.HTTP_400_BAD_REQUEST)

        rows, err = _read_excel_to_rows(excel_file)
        if err:
            return Response(err, status=status.HTTP_400_BAD_REQUEST)

        preview_rows, duplicates, errors, counts = _analyze_rows(rows)

        # create
        to_create = []
        for r in preview_rows:
            email = r.get("customer_email") or None
            to_create.append(
                Customer(
                    customer_name=r["customer_name"],
                    customer_surname=r["customer_surname"],
                    customer_phone=r["customer_phone"],
                    customer_email=email,
                    email_normalized=(email or "").lower(),
                    created_by=request.user,
                    updated_by=request.user,
                    # tag=None, assigned_to=None
                )
            )

        with transaction.atomic():
            created = Customer.objects.bulk_create(to_create, batch_size=500)

        return Response(
            {
                **counts,
                "created": len(created),
                "created_ids": [c.id for c in created],
                "duplicates": duplicates,
                "row_errors": errors,
            },
            status=status.HTTP_200_OK,
        )



class AdminCustomerViewSet(viewsets.ModelViewSet):
    """
    A viewset that provides search, filter, order features. Accesible for Admin/Staff
    """

    queryset = Customer.objects.all().order_by("-created_at")
    authentication_classes = [CustomAuthentication]
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    pagination_class = CustomPagination

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = CustomerFilter

    search_fields = [
        "customer_name",
        "customer_surname",
        "customer_email",
        "customer_phone",
    ]

    ordering_fields = ["created_at", "updated_at", "customer_name"]
    ordering = ["customer_name"]  # varsayılan


class UserCustomerViewSet(viewsets.ModelViewSet):
    """
    A viewset that provides search, filter, order features. Accesible for Users
    """

    queryset = Customer.objects.all().order_by("-created_at")
    authentication_classes = [CustomAuthentication]
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = CustomerFilter

    search_fields = [
        "customer_name",
        "customer_surname",
        "customer_email",
        "customer_phone",
    ]

    # ordering_fields = ["created_at", "updated_at", "customer_name"]
    ordering_fields = [
        "customer_name",
        "customer_surname",
        "customer_email",
        "created_at",
        "updated_at",
        "status",
        "source",
    ]
    ordering = ["customer_name"]  # varsayılan

    def get_queryset(self):
        if self.request.user.is_staff or self.request.user.is_superuser:
            return Customer.objects.all().order_by("-created_at")
        return (
            super().get_queryset().filter(assigned_to=self.request.user, is_active=True)
        )

    # def retrieve(self, request, *args, **kwargs):
    #     customer = self.get_object()
    #     user = request.user
    #     is_admin_or_assigned_to_user(request, customer, user)
    #     serializer = self.get_serializer(customer)
    #     return Response(serializer.data, status=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        """
        Allow updating tag and/or adding a note in a single request.
        e.g: { "tag": 7, "note": "Called the customer" }
        """

        customer = self.get_object()
        user = request.user
        is_admin_or_assigned_to_user(request, customer, user)

        incoming_fields = set(request.data.keys())
        if not incoming_fields:
            raise ValidationError({"non_field_errors": ["No data provided."]})
        allowed_fields = {"tag", "note"}
        if not incoming_fields.issubset(allowed_fields):
            raise ValidationError(
                {"non_field_errors": ["Only the tag and note fields can be updated."]}
            )

        # Handle tag change (optional)
        if "tag" in request.data:
            tag_value = request.data.get("tag")
            if tag_value in (None, "", "null"):
                new_tag = None
            else:
                try:
                    new_tag = Tag.objects.get(pk=tag_value)
                except (Tag.DoesNotExist, ValueError, TypeError):
                    raise NotFound("Tag not found.")
            customer.set_current_tag(
                new_tag, by=user, assign_to=customer.assigned_to or user
            )

        # Handle note creation (optional)
        if "note" in request.data:
            note_text = request.data.get("note")
            if note_text in (None, ""):
                raise ValidationError({"note": ["Note text is required."]})

            note_payload = {"customer": customer.id, "note": note_text}
            note_serializer = NotesSerializer(
                data=note_payload, context={"request": request}
            )
            note_serializer.is_valid(raise_exception=True)
            note_serializer.save()

        serializer = self.get_serializer(customer)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all().order_by("id")
    serializer_class = TagSerializer
    authentication_classes = [CustomAuthentication]
    lookup_field = "pk"

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminUser()]


class CustomerTagHistoryViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerTagHistorySerializer
    authentication_classes = [CustomAuthentication]
    lookup_field = "pk"
    filter_backends = (
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    )
    filterset_class = TagHistoryFilter

    # search_fields = ["name", "slug"]

    ordering_fields = ["changed_at", "customer_id"]
    ordering = ["changed_at"]

    def get_permissions(self):
        if self.action in {"list"}:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminUser()]

    def get_queryset(self):
        base_qs = CustomerTagHistory.objects.select_related(
            "customer", "from_tag", "to_tag"
        )
        user = getattr(self.request, "user", None)
        if user and (user.is_staff or user.is_superuser):
            return base_qs.order_by("-changed_at")
        return base_qs.filter(customer__assigned_to=user).order_by("-changed_at")

    # @action(detail=False, methods=["get"], url_path="by-customer")
    # def customers_tag_history(self, request, *args, **kwargs):
    #     """
    #     ?customer_id= parametresi gerekli.
    #     customer_id ye göre TAG tarihçesi döner.
    #     Güncelden eskiye doğru sıralar.
    #     """
    #     customer_id = request.query_params.get("customer_id")
    #     if not customer_id:
    #         raise ValidationError(
    #             {"customer_id": ["This query parameter is required."]}
    #         )
    #     try:
    #         customer_id_int = int(customer_id)
    #     except (TypeError, ValueError):
    #         raise ValidationError({"customer_id": ["Must be an integer."]})
    #
    #     queryset = (
    #         self.get_queryset()
    #         .filter(customer_id=customer_id_int)
    #         .order_by("-changed_at")
    #     )
    #     serializer = self.get_serializer(queryset, many=True)
    #     return Response(serializer.data, status=status.HTTP_200_OK)


class NotesViewSet(viewsets.ModelViewSet):
    queryset = Notes.objects.all().order_by("customer", "created_at")
    serializer_class = NotesSerializer
    authentication_classes = [CustomAuthentication]
    lookup_field = "pk"
    filter_backends = (
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    )
    filterset_class = NoteHistoryFilter

    search_fields = ["id", "note"]

    ordering_fields = ["created_at"]
    ordering = ["created_at"]  # varsayılan

    def get_permissions(self):
        if self.action in {"list", "create", "retrieve"}:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminUser()]

    def get_queryset(self):
        base_qs = Notes.objects.select_related("customer", "created_by", "updated_by")
        user = getattr(self.request, "user", None)
        if not user or not user.is_authenticated:
            return base_qs.none()
        if user.is_staff or user.is_superuser:
            return base_qs.order_by("customer", "-created_at")
        return base_qs.filter(customer__assigned_to=user)

    # def create(self, request, *args, **kwargs):
    #     customer = request.customer
    #     user = request.user
    #     is_admin_or_assigned_to_user(request, customer, user)
    #     serializer = NotesSerializer(data=request.data)
    #     if serializer.is_valid():
    #         return Response(serializer.data, status=status.HTTP_201_CREATED)
    #     return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def perform_create(self, serializer):
        customer = serializer.validated_data["customer"]
        is_admin_or_assigned_to_user(self.request, customer, self.request.user)
        serializer.save()

    def retrieve(self, request, *args, **kwargs):
        note = self.get_object()
        customer = note.customer
        is_admin_or_assigned_to_user(request, customer, request.user)
        serializer = self.get_serializer(note)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # @action(detail=False, methods=["get"], url_path="by-customer")
    # def customers_note_history(self, request, *args, **kwargs):
    #     """
    #     ?customer_id= parametresi gerekli.
    #     customer_id ye göre NOT tarihçesi döner.
    #     Güncelden eskiye doğru sıralar.
    #     """
    #     customer_id = request.query_params.get("customer_id")
    #     if not customer_id:
    #         raise ValidationError(
    #             {"customer_id": ["This query parameter is required."]}
    #         )
    #     try:
    #         customer_id_int = int(customer_id)
    #     except (TypeError, ValueError):
    #         raise ValidationError({"customer_id": ["Must be an integer."]})
    #     customer = get_object_or_404(
    #         Customer.objects.select_related("assigned_to"), pk=customer_id_int
    #     )
    #     is_admin_or_assigned_to_user(request, customer, request.user)
    #     queryset = (
    #         self.get_queryset()
    #         .filter(customer_id=customer_id_int)
    #         .order_by("-created_at", "-updated_at")
    #     )
    #     serializer = self.get_serializer(queryset, many=True)
    #     return Response(serializer.data, status=status.HTTP_200_OK)
