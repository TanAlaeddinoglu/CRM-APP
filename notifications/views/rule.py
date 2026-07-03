from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authenticate import CustomAuthentication
from notifications.exceptions import RuleNotEditableError
from notifications.models import NotificationRule
from notifications.permissions import IsNotificationAdmin
from notifications.serializers.rule import NotificationRuleSerializer
from notifications.services.rules import NotificationRuleService


class NotificationRuleListCreateView(APIView):
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsNotificationAdmin]

    def get(self, request):
        rules = NotificationRule.objects.all()
        return Response(NotificationRuleSerializer(rules, many=True).data)

    def post(self, request):
        serializer = NotificationRuleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        rule = NotificationRuleService.create(
            type_key=d["type_key"],
            name=d["name"],
            channels=d["channels"],
            title_template=d.get("title_template"),
            body_template=d.get("body_template"),
            created_by=request.user,
        )
        return Response(
            NotificationRuleSerializer(rule).data, status=status.HTTP_201_CREATED
        )


class NotificationRuleDetailView(APIView):
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsNotificationAdmin]

    def _get_rule(self, pk):
        try:
            return NotificationRule.objects.get(pk=pk)
        except NotificationRule.DoesNotExist:
            return None

    def get(self, request, pk):
        rule = self._get_rule(pk)
        if rule is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(NotificationRuleSerializer(rule).data)

    def patch(self, request, pk):
        rule = self._get_rule(pk)
        if rule is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = NotificationRuleSerializer(rule, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        try:
            updated = NotificationRuleService.update(
                rule,
                name=d.get("name"),
                channels=d.get("channels"),
                title_template=d.get("title_template"),
                body_template=d.get("body_template"),
                is_active=d.get("is_active"),
            )
        except RuleNotEditableError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(NotificationRuleSerializer(updated).data)

    def delete(self, request, pk):
        rule = self._get_rule(pk)
        if rule is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        try:
            NotificationRuleService.delete(rule)
        except RuleNotEditableError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)
