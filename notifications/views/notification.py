from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authenticate import CustomAuthentication
from notifications.models import Notification
from notifications.serializers.notification import NotificationSerializer
from notifications.services.feed import NotificationFeedService

WEEK = timedelta(days=7)
MAX_PER_WEEK = 200


class NotificationListView(APIView):
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        is_read_param = request.query_params.get("is_read")
        is_read = None
        if is_read_param == "true":
            is_read = True
        elif is_read_param == "false":
            is_read = False

        now = timezone.now()

        # offset_weeks=0 → last 7 days (default)
        # offset_weeks=1 → days 7-14, offset_weeks=2 → days 14-21, …
        try:
            offset_weeks = max(0, int(request.query_params.get("offset_weeks", 0)))
        except (TypeError, ValueError):
            offset_weeks = 0

        created_before = now - WEEK * offset_weeks
        created_after = created_before - WEEK

        qs = NotificationFeedService.list_for_user(
            request.user,
            is_read=is_read,
            created_after=created_after,
            created_before=created_before,
        )
        serializer = NotificationSerializer(qs[:MAX_PER_WEEK], many=True)
        return Response(serializer.data)


class NotificationMarkReadView(APIView):
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        NotificationFeedService.mark_read(notification, request.user)
        return Response(NotificationSerializer(notification).data)


class NotificationDeleteView(APIView):
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        NotificationFeedService.delete(notification, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationDeleteAllView(APIView):
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        count = NotificationFeedService.delete_all(request.user)
        return Response({"deleted": count})


class NotificationMarkAllReadView(APIView):
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        count = NotificationFeedService.mark_all_read(request.user)
        return Response({"marked_read": count})


class NotificationUnreadCountView(APIView):
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = NotificationFeedService.unread_count(request.user)
        return Response({"unread_count": count})
