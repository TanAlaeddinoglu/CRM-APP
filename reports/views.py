from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.authenticate import CustomAuthentication
from reports.permissions import IsReportAdmin
from reports.serializers import (
    AppointmentsSummaryQuerySerializer,
    MyPerformanceQuerySerializer,
    PaymentSummaryQuerySerializer,
    UserDashboardSummaryQuerySerializer,
)
from reports.services import (
    build_appointments_summary,
    build_my_performance_summary,
    build_payment_summary,
    build_product_price_distribution_summary,
    build_user_dashboard_summary,
    resolve_date_range,
)


class UserDashboardSummaryViewSet(viewsets.ViewSet):
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsReportAdmin]

    def list(self, request):
        serializer = UserDashboardSummaryQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data
        start_dt, end_dt = resolve_date_range(validated_data)
        target_user = validated_data["target_user"]

        payload = build_user_dashboard_summary(
            target_user=target_user,
            start_dt=start_dt,
            end_dt=end_dt,
        )
        return Response(payload)


class MyPerformanceViewSet(viewsets.ViewSet):
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated]

    def list(self, request):
        serializer = MyPerformanceQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        start_dt, end_dt = resolve_date_range(serializer.validated_data)
        payload = build_my_performance_summary(
            target_user=request.user,
            start_dt=start_dt,
            end_dt=end_dt,
        )
        return Response(payload)


class AppointmentsSummaryViewSet(viewsets.ViewSet):
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsReportAdmin]

    def list(self, request):
        serializer = AppointmentsSummaryQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data
        start_dt, end_dt = resolve_date_range(validated_data)
        target_user = validated_data.get("target_user")
        target_product = validated_data.get("target_product")

        payload = build_appointments_summary(
            start_dt=start_dt,
            end_dt=end_dt,
            target_user=target_user,
            target_product=target_product,
        )
        return Response(payload)


class PaymentSummaryViewSet(viewsets.ViewSet):
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsReportAdmin]

    def list(self, request):
        serializer = PaymentSummaryQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data
        start_dt, end_dt = resolve_date_range(validated_data)
        target_user = validated_data.get("target_user")
        target_product = validated_data.get("target_product")

        payload = build_payment_summary(
            start_dt=start_dt,
            end_dt=end_dt,
            target_user=target_user,
            target_product=target_product,
        )
        return Response(payload)


class ProductPriceDistributionSummaryViewSet(viewsets.ViewSet):
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsReportAdmin]

    def list(self, request):
        serializer = PaymentSummaryQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data
        start_dt, end_dt = resolve_date_range(validated_data)
        target_user = validated_data.get("target_user")
        target_product = validated_data.get("target_product")

        payload = build_product_price_distribution_summary(
            start_dt=start_dt,
            end_dt=end_dt,
            target_user=target_user,
            target_product=target_product,
        )
        return Response(payload)
