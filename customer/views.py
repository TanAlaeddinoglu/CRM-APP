# customer/views.py

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, SAFE_METHODS
from rest_framework.exceptions import ValidationError, NotFound
from rest_framework import status, viewsets, filters

from django.db.models import Count, Q  # ✅ NEW
from rest_framework.views import APIView  # ✅ NEW

from accounts.authenticate import CustomAuthentication
from common.pagination import CustomPagination
from .bulkViews import CUSTOMER_FIELDS, _nullish, User, _set_customer_products
from .filters import CustomerFilter, TagHistoryFilter, NoteHistoryFilter
from .serializers import (
    CustomerSerializer,
    CustomerTagHistorySerializer,
    TagSerializer,
    NotesSerializer,
)
from .models import Customer, Tag, CustomerTagHistory, Notes
from .services import is_admin_or_assigned_to_user


# -------------------------
# Customer ViewSets
# -------------------------
class AdminCustomerViewSet(viewsets.ModelViewSet):
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
    ordering = ["customer_name", "-updated_at"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        customer = self.get_object()
        user = request.user

        data = request.data.copy()

        tag_value = data.pop("tag", None)
        assigned_value = data.pop("assigned_to", None)
        note_text = data.pop("note", None)

        products_value = data.pop("products", None)

        if data:
            serializer = self.get_serializer(customer, data=data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            customer = serializer.instance

        new_assignee = getattr(customer, "assigned_to", None)
        if assigned_value is not None and "assigned_to" in CUSTOMER_FIELDS:
            if _nullish(assigned_value):
                new_assignee = None
            else:
                try:
                    new_assignee = User.objects.get(pk=int(assigned_value))
                except (User.DoesNotExist, ValueError, TypeError):
                    raise NotFound("Assigned user not found.")

            customer.assigned_to = new_assignee
            customer.updated_by = user
            update_fields = ["assigned_to", "updated_by"]
            if "updated_at" in CUSTOMER_FIELDS:
                update_fields.append("updated_at")
            customer.save(update_fields=update_fields)

        if tag_value is not None:
            if _nullish(tag_value) or str(tag_value).strip() == "-":
                new_tag = None
            else:
                try:
                    new_tag = Tag.objects.get(pk=int(tag_value))
                except (Tag.DoesNotExist, ValueError, TypeError):
                    raise NotFound("Tag not found.")

            if hasattr(customer, "set_current_tag"):
                customer.set_current_tag(
                    new_tag, by=user, assign_to=new_assignee or user
                )
            elif "tag" in CUSTOMER_FIELDS:
                customer.tag = new_tag
                customer.updated_by = user
                customer.save(update_fields=["tag", "updated_by"])

        if note_text is not None and not _nullish(note_text):
            payload = {"customer_id": customer.id, "note": str(note_text)}
            ns = NotesSerializer(data=payload, context={"request": request})
            ns.is_valid(raise_exception=True)
            ns.save()

        # ✅ NEW: products set (string -> CustomerProduct)
        if products_value is not None and not _nullish(products_value):
            try:
                _set_customer_products(customer, str(products_value), by_user=user)
            except Exception as ex:
                raise ValidationError({"products": [f"Products update failed: {ex}"]})

        return Response(self.get_serializer(customer).data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        customer = self.get_object()

        if "is_active" not in CUSTOMER_FIELDS:
            raise ValidationError(
                {
                    "detail": "Customer modelinde is_active alanı yok. Soft delete için gerekli."
                }
            )

        customer.is_active = False
        customer.updated_by = request.user

        update_fields = ["is_active", "updated_by"]
        if "updated_at" in CUSTOMER_FIELDS:
            update_fields.append("updated_at")

        customer.save(update_fields=update_fields)
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserCustomerViewSet(viewsets.ModelViewSet):
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
    ordering_fields = [
        "customer_name",
        "customer_surname",
        "customer_email",
        "created_at",
        "updated_at",
        "status",
        "source",
    ]
    ordering = ["-updated_at"]

    def get_queryset(self):
        if self.request.user.is_staff or self.request.user.is_superuser:
            return Customer.objects.all().order_by("-created_at")
        qs = super().get_queryset()
        if "is_active" in CUSTOMER_FIELDS:
            qs = qs.filter(is_active=True)
        return qs.filter(assigned_to=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        customer = self.get_object()
        user = request.user
        is_admin_or_assigned_to_user(request, customer, user)

        incoming_fields = set(request.data.keys())
        if not incoming_fields:
            raise ValidationError({"non_field_errors": ["No data provided."]})

        # User tarafında sadece kendi customer'i için tag, note ve products güncellenebilir.
        allowed_fields = {"tag", "note", "products"}
        if not incoming_fields.issubset(allowed_fields):
            raise ValidationError(
                {
                    "non_field_errors": [
                        "Only the tag, note, and products fields can be updated."
                    ]
                }
            )

        if "tag" in request.data:
            tag_value = request.data.get("tag")
            if _nullish(tag_value) or str(tag_value).strip() == "-":
                new_tag = None
            else:
                try:
                    new_tag = Tag.objects.get(pk=int(tag_value))
                except (Tag.DoesNotExist, ValueError, TypeError):
                    raise NotFound("Tag not found.")

            if hasattr(customer, "set_current_tag"):
                customer.set_current_tag(
                    new_tag,
                    by=user,
                    assign_to=getattr(customer, "assigned_to", None) or user,
                )
            elif "tag" in CUSTOMER_FIELDS:
                customer.tag = new_tag
                customer.updated_by = user
                customer.save(update_fields=["tag", "updated_by"])

        if "note" in request.data:
            note_text = request.data.get("note")
            if _nullish(note_text):
                raise ValidationError({"note": ["Note text is required."]})

            payload = {"customer_id": customer.id, "note": str(note_text)}
            ns = NotesSerializer(data=payload, context={"request": request})
            ns.is_valid(raise_exception=True)
            ns.save()

        if "products" in request.data:
            products_value = request.data.get("products")
            if _nullish(products_value):
                raise ValidationError({"products": ["Products value is required."]})
            try:
                _set_customer_products(customer, str(products_value), by_user=user)
            except Exception as ex:
                raise ValidationError({"products": [f"Products update failed: {ex}"]})

        return Response(self.get_serializer(customer).data, status=status.HTTP_200_OK)


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all().order_by("id")
    serializer_class = TagSerializer
    authentication_classes = [CustomAuthentication]
    lookup_field = "pk"

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminUser()]


# -------------------------
# Tag / History / Notes
# -------------------------
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
    ordering = ["created_at"]

    def get_permissions(self):
        if self.action in {"list", "create", "retrieve", "update", "partial_update"}:
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

    def perform_create(self, serializer):
        customer = serializer.validated_data["customer"]
        is_admin_or_assigned_to_user(self.request, customer, self.request.user)
        serializer.save()

    def perform_update(self, serializer):
        customer = serializer.instance.customer
        is_admin_or_assigned_to_user(self.request, customer, self.request.user)
        serializer.save()

    def retrieve(self, request, *args, **kwargs):
        note = self.get_object()
        customer = note.customer
        is_admin_or_assigned_to_user(request, customer, request.user)
        serializer = self.get_serializer(note)
        return Response(serializer.data, status=status.HTTP_200_OK)


# TODO: CustomerTagStatsMeView ile CustomerTagStatsAdminView endpointlerini birleştir
# ============================================================
# ✅ NEW: Tag Statistics Endpoints (pagination bağımsız)
# ============================================================
class CustomerTagStatsAdminView(APIView):
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        qs = Customer.objects.all()

        # aynı filterset (status, source, assigned_to, tag)
        qs = CustomerFilter(request.GET, queryset=qs).qs

        # SearchFilter mantığı: ?search=
        search = (request.GET.get("search") or "").strip()
        if search:
            qs = qs.filter(
                Q(customer_name__icontains=search)
                | Q(customer_surname__icontains=search)
                | Q(customer_email__icontains=search)
                | Q(customer_phone__icontains=search)
            )

        total = qs.count()

        by_tag = (
            qs.values("tag__tag_name")  # NULL -> None (frontend "Etiketsiz" yapabilir)
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        return Response({"total": total, "by_tag": list(by_tag)})


class CustomerTagStatsMeView(APIView):
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Customer.objects.all()

        # User list mantığınla aynı: admin değilse assigned_to=user + (varsa) is_active=True
        if not (request.user.is_staff or request.user.is_superuser):
            if "is_active" in CUSTOMER_FIELDS:
                qs = qs.filter(is_active=True)
            qs = qs.filter(assigned_to=request.user)

        qs = CustomerFilter(request.GET, queryset=qs).qs

        search = (request.GET.get("search") or "").strip()
        if search:
            qs = qs.filter(
                Q(customer_name__icontains=search)
                | Q(customer_surname__icontains=search)
                | Q(customer_email__icontains=search)
                | Q(customer_phone__icontains=search)
            )

        total = qs.count()

        by_tag = (
            qs.values("tag__tag_name").annotate(count=Count("id")).order_by("-count")
        )

        return Response({"total": total, "by_tag": list(by_tag)})
