from django.db import transaction
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authenticate import CustomAuthentication
from notifications.permissions import IsNotificationAdmin
from .models import ReminderRule
from .serializers import ReminderRuleSerializer
from .services import allowed_condition_fields
from .tasks import regenerate_future_reminders


def _trigger_backfill():
    # Kural değişimi sonrası gelecekteki randevular için hatırlatmaları yeniden üret.
    transaction.on_commit(lambda: regenerate_future_reminders.delay())


class ReminderConditionFieldsView(APIView):
    """Koşul oluşturucu için izin verilen alanlar + değer choices."""

    authentication_classes = [CustomAuthentication]
    permission_classes = [IsNotificationAdmin]

    def get(self, request):
        return Response(allowed_condition_fields())


class ReminderRuleListCreateView(APIView):
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsNotificationAdmin]

    def get(self, request):
        rules = (
            ReminderRule.objects.select_related("notification_rule")
            .prefetch_related("conditions", "offsets")
            .all()
        )
        return Response(ReminderRuleSerializer(rules, many=True).data)

    def post(self, request):
        serializer = ReminderRuleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        rule = serializer.save(created_by=request.user)
        _trigger_backfill()
        return Response(
            ReminderRuleSerializer(rule).data, status=status.HTTP_201_CREATED
        )


class ReminderRuleDetailView(APIView):
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsNotificationAdmin]

    def _get_rule(self, pk):
        try:
            return (
                ReminderRule.objects.select_related("notification_rule")
                .prefetch_related("conditions", "offsets")
                .get(pk=pk)
            )
        except ReminderRule.DoesNotExist:
            return None

    def get(self, request, pk):
        rule = self._get_rule(pk)
        if rule is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(ReminderRuleSerializer(rule).data)

    def patch(self, request, pk):
        rule = self._get_rule(pk)
        if rule is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = ReminderRuleSerializer(rule, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        _trigger_backfill()
        return Response(ReminderRuleSerializer(updated).data)

    def delete(self, request, pk):
        rule = self._get_rule(pk)
        if rule is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        rule.delete()
        _trigger_backfill()
        return Response(status=status.HTTP_204_NO_CONTENT)
