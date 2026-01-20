from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.exceptions import PermissionDenied

from accounts.authenticate import CustomAuthentication
from common.utils import PAYMENT_STATUS
from events.filters import AppointmentFilter
from rest_framework.pagination import PageNumberPagination
from events.models import Appointment, AppointmentPayment
from events.serializers import AppointmentSerializer, AppointmentPaymentSerializer
from django.db.models import Sum
from decimal import Decimal


class AppointmentPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 1000


class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = AppointmentPagination
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = AppointmentFilter
    search_fields = ["name", "customer__customer_name", "customer__customer_surname"]
    ordering_fields = ["name", "scheduled_for"]
    ordering = ("-scheduled_for",)

    # ✅ LIST: Admin her şeyi görür, user sadece kendi customer'larının randevularını görür
    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if user.is_staff or user.is_superuser:
            return qs

        return qs.filter(customer__assigned_to=user)

    # ✅ DETAIL/UPDATE/DELETE: URL ile başka randevuya erişimi de kapat
    def get_object(self):
        obj = super().get_object()
        user = self.request.user

        if user.is_staff or user.is_superuser:
            return obj

        if obj.customer.assigned_to_id != user.id:
            raise PermissionDenied("Bu randevuya erişim yetkin yok.")
        return obj

    # ✅ CREATE: user başka customer'a randevu açamasın
    def perform_create(self, serializer):
        user = self.request.user
        customer = serializer.validated_data.get("customer")

        if not (user.is_staff or user.is_superuser):
            if customer is None or customer.assigned_to_id != user.id:
                raise PermissionDenied("Bu müşteri için randevu oluşturamazsın.")

        serializer.save(created_by=user, updated_by=user)

    # ✅ UPDATE: user başka customer'a bağlı randevuyu güncelleyemesin
    def perform_update(self, serializer):
        user = self.request.user
        customer = serializer.validated_data.get("customer", None)

        if not (user.is_staff or user.is_superuser):
            effective_customer = customer or getattr(serializer.instance, "customer", None)
            if effective_customer is None or effective_customer.assigned_to_id != user.id:
                raise PermissionDenied("Bu randevuyu güncelleyemezsin.")

        serializer.save(updated_by=user)


class AppointmentPaymentsViewSet(viewsets.ModelViewSet):
    queryset = AppointmentPayment.objects.all()
    serializer_class = AppointmentPaymentSerializer
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = [
        "total_amount",
        "payment_status",
        "payment_date",
        "appointment__customer__customer_name",
        "appointment__customer__customer_surname",
        "appointment__customer__assigned_to__username",
    ]
    ordering_fields = [
        "payment_date",
        "appointment__customer__assigned_to__username",
    ]
    ordering = "-id"

    def perform_destroy(self, instance):
        appointment = instance.appointment
        total_amount = instance.total_amount

        super().perform_destroy(instance)

        total_paid = AppointmentPayment.objects.filter(
            appointment=appointment
        ).aggregate(total=Sum("paid_amount")).get("total") or Decimal("0.00")

        remaining = total_amount - total_paid

        last_payment = (
            AppointmentPayment.objects.filter(appointment=appointment)
            .order_by("-created_at")
            .first()
        )

        if last_payment:
            last_payment.remaining_amount = remaining
            last_payment.payment_status = (
                PAYMENT_STATUS[1][0]
                if remaining == Decimal("0.00")
                else PAYMENT_STATUS[0][0]
            )
            last_payment.save(update_fields=["remaining_amount", "payment_status"])
