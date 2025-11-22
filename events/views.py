from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from accounts.authenticate import CustomAuthentication
from events.models import Appointment, AppointmentPayment
from events.serializers import AppointmentSerializer, AppointmentPaymentSerializer


class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ["name"]
    ordering_fields = ["name"]
    ordering = ("name",)


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
