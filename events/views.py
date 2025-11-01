from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from accounts.authenticate import CustomAuthentication
from events.models import Appointment
from events.serializers import AppointmentSerializer


class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ["name"]
    ordering_fields = ["name"]
    ordering = ("name",)
