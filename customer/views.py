from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.response import Response

from rest_framework.permissions import IsAuthenticated, IsAdminUser, SAFE_METHODS
from rest_framework.exceptions import ValidationError, NotFound
from rest_framework import status, viewsets, filters

from accounts.authenticate import CustomAuthentication
from .filters import CustomerFilter, TagHistoryFilter, NoteHistoryFilter
from .serializers import (
    CustomerSerializer,
    CustomerTagHistorySerializer,
    TagSerializer,
    NotesSerializer,
)
from .models import Customer, Tag, CustomerTagHistory, Notes
from .services import is_admin_or_assigned_to_user


class AdminCustomerViewSet(viewsets.ModelViewSet):
    """
    A viewset that provides search, filter, order features. Accesible for Admin/Staff
    """

    queryset = Customer.objects.all().order_by("-created_at")
    authentication_classes = [CustomAuthentication]
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

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
    ordering = ["-created_at"]  # varsayılan


class UserCustomerViewSet(viewsets.ModelViewSet):
    """
    A viewset that provides search, filter, order features. Accesible for Users
    """

    queryset = Customer.objects.all().order_by("-created_at")
    authentication_classes = [CustomAuthentication]
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]

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
    ordering = ["-created_at"]  # varsayılan

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
