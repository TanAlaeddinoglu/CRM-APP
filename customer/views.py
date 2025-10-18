from django.db.models import Q
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework.permissions import IsAuthenticated, IsAdminUser, IsAuthenticatedOrReadOnly
from rest_framework import status, viewsets

from accounts.authenticate import CustomAuthentication
from accounts.models import CustomUser
from .serializers import CustomerSerializer, CustomerTagHistorySerializer, TagSerializer
from .models import Customer, Tag, CustomerTagHistory
from .services import is_admin_or_assigned_to_user


class AdminCustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('-created_at')
    authentication_classes = [CustomAuthentication]
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    lookup_field = 'pk'

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        search_term = request.query_params.get('search')
        if search_term:
            queryset = queryset.filter(
                Q(customer_name__icontains=search_term) |
                Q(customer_surname__icontains=search_term) |
                Q(customer_email__icontains=search_term) |
                Q(customer_phone__icontains=search_term)
            )

        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        source_filter = request.query_params.get('source')
        if source_filter:
            queryset = queryset.filter(source=source_filter)

        assigned_to = request.query_params.get('assigned_to')
        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)

        tag_param = request.query_params.get('tag')
        if tag_param is not None:
            if isinstance(tag_param, str) and tag_param.lower() == "null":
                queryset = queryset.filter(tag__isnull=True)
            elif tag_param != "":
                queryset = queryset.filter(tag_id=tag_param)

        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)

        return Response(serializer.data, status=status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        customer = self.get_object()
        serializer_context = self.get_serializer_context()

        customer_data = self.get_serializer(customer).data
        history_qs = customer.tag_history.all().order_by("-changed_at")
        history_data = CustomerTagHistorySerializer(history_qs, many=True, context=serializer_context).data

        return Response(
            {
                "customer": customer_data,
                "tag_history": history_data,
            },
            status=status.HTTP_200_OK,
        )
    #TODO: Delete func override et delete olanlari archived tablosuna gonder
    #def destroy(self, request, *args, **kwargs):


class UserCustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('-created_at')
    authentication_classes = [CustomAuthentication]
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, IsAuthenticatedOrReadOnly]
    lookup_field = 'pk'

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset()).filter(assigned_to=self.request.user,
                                                                    status="active").order_by('id')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        customer = self.get_object()
        user = request.user
        is_admin_or_assigned_to_user(request, customer, user)
        serializer = self.get_serializer(customer)
        return Response(serializer.data, status=status.HTTP_200_OK)

    #TODO: PUT /customers/{id}/ 	—Not güncellemesi. Baska fieldlarda gerekebilir.
    def partial_update(self, request, *args, **kwargs):
        """
        Sadece tag fieldi kabul eder.
        e.g: { "tag": 7 }
        """
        customer = self.get_object()
        user = request.user
        is_admin_or_assigned_to_user(request, customer, user)

        incoming_fields = set(request.data.keys())
        if not incoming_fields:
            return Response({"detail": "No data provided."}, status=status.HTTP_400_BAD_REQUEST)
        if incoming_fields != {"tag"}:
            return Response({"detail": "Only the tag field can be updated."}, status=status.HTTP_400_BAD_REQUEST)

        tag_value = request.data.get("tag")
        if tag_value in (None, "", "null"):
            new_tag = None
        else:
            try:
                new_tag = Tag.objects.get(pk=tag_value)
            except (Tag.DoesNotExist, ValueError, TypeError):
                return Response({"detail": "Tag not found."}, status=status.HTTP_404_NOT_FOUND)

        customer.set_current_tag(new_tag, by=user)
        serializer = self.get_serializer(customer)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all().order_by('id')
    serializer_class = TagSerializer
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    lookup_field = 'pk'


#TODO: 	# TAG HISTORY ENDPOINTS
    # GET /customers/tag-history/		- tüm tag history verileri (admin)
    # POST /customers/tag-history/		- tag history yaratman (admin)
    # GET /customers/tag-history/{id} 	— ilgili müşterinin tag geçmişi (user)
    # PUT /customers/tag-history/{id} 	— tag history guncelleme (admin)
    # DELETE /customers/tag-history/{id}  	— tag history silme (admin)
    # permission ve role kontrolunun nasil yapilacak
class CustomerTagHistoryViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerTagHistorySerializer
    authentication_classes = [CustomAuthentication]
    lookup_field = 'pk'

    def get_permissions(self):
        admin_actions = {"list", "create", "update", "partial_update", "destroy"}
        if self.action in admin_actions:
            permission_classes = [IsAuthenticated, IsAdminUser]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        base_qs = CustomerTagHistory.objects.select_related("customer", "from_tag", "to_tag")
        user = getattr(self.request, "user", None)
        if user and (user.is_staff or user.is_superuser):
            return base_qs.order_by('-changed_at')
        return base_qs.filter(customer__assigned_to=user).order_by('-changed_at')
