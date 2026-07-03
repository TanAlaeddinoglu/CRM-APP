from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authenticate import CustomAuthentication
from customer.bulkSerilaizer import (
    CustomerBulkCreateSerializer,
    CustomerBulkUpdateSerializer,
    CustomerBulkDeleteSerializer,
)
from customer.services import CustomerService


class CustomerBulkView(APIView):
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        ser = CustomerBulkCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        result = CustomerService.bulk_create(ser.validated_data["items"], request.user)
        return Response(result, status=status.HTTP_201_CREATED)

    def patch(self, request):
        ser = CustomerBulkUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        result = CustomerService.bulk_update(ser.validated_data["items"], request.user, request)
        return Response(result, status=status.HTTP_200_OK)

    def delete(self, request):
        ser = CustomerBulkDeleteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        result = CustomerService.bulk_delete(ser.validated_data["ids"], request.user)
        return Response(result, status=status.HTTP_200_OK)
