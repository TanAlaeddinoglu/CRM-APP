from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from accounts.authenticate import CustomAuthentication
from .serializers import CustomerSerializer
from .models import Customer
from .services import validate_customer_phone


class CustomerList(APIView):
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = CustomerSerializer
    queryset = Customer.objects.all().order_by('id')

    def get(self, request, format=None):
        customers = self.queryset.all()
        serializer = self.serializer_class(customers, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, format=None):
        data = request.data.copy()
        data["customer_phone"] = validate_customer_phone(data.get("customer_phone"))

        serializer = self.serializer_class(
            data=data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
