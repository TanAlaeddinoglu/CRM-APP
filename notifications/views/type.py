from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authenticate import CustomAuthentication
from notifications.registry import registry
from notifications.serializers.type import NotificationTypeSerializer


class NotificationTypeListView(APIView):
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        types = registry.all()
        return Response(NotificationTypeSerializer(types, many=True).data)
