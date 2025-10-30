from django.utils import timezone
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.exceptions import (
    TokenError,
    InvalidToken,
)

from rest_framework_simplejwt.views import TokenRefreshView
from djangoCRM import settings

from .authenticate import CustomAuthentication, enforce_csrf
from .serializers import CustomUserSerializer, UserLoginSerializer
from .models import CustomUser


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)

    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


class UserLoginView(APIView):
    def post(self, request, format=None):
        enforce_csrf(request)
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            user = serializer.validated_data
            if user:
                user.last_login = timezone.now()
                user.save(update_fields=["last_login"])
                data = get_tokens_for_user(user)
                response = Response({"Success": "Login successfully", "data": data})
                response.set_cookie(
                    key=settings.SIMPLE_JWT["AUTH_COOKIE"],
                    value=data["access"],
                    expires=settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"],
                    secure=settings.SIMPLE_JWT["AUTH_COOKIE_SECURE"],
                    httponly=settings.SIMPLE_JWT["AUTH_COOKIE_HTTP_ONLY"],
                    samesite=settings.SIMPLE_JWT["AUTH_COOKIE_SAMESITE"],
                )
                response.set_cookie(
                    key=settings.SIMPLE_JWT["AUTH_COOKIE_REFRESH_TOKEN"],
                    value=data["refresh"],
                    expires=settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"],
                    secure=settings.SIMPLE_JWT["AUTH_COOKIE_SECURE"],
                    httponly=settings.SIMPLE_JWT["AUTH_COOKIE_HTTP_ONLY"],
                    samesite=settings.SIMPLE_JWT["AUTH_COOKIE_SAMESITE"],
                )
                return response
        return Response(
            {"error : Wrong Credentials! "}, status=status.HTTP_403_FORBIDDEN
        )


class LogoutView(APIView):
    def post(self, request, format=None):
        enforce_csrf(request)
        refresh_cookie_name = settings.SIMPLE_JWT["AUTH_COOKIE_REFRESH_TOKEN"]
        refresh_token = request.COOKIES.get(refresh_cookie_name)

        if refresh_token:
            try:
                refresh = RefreshToken(refresh_token)
                refresh.blacklist()
            except TokenError:
                return Response(
                    {"error": "Error in Invalidating Token! "},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        response = Response(
            {"message": "Succesfully logged out!"}, status=status.HTTP_200_OK
        )
        response.delete_cookie(key=settings.SIMPLE_JWT["AUTH_COOKIE"])
        response.delete_cookie(key=settings.SIMPLE_JWT["AUTH_COOKIE_REFRESH_TOKEN"])
        return response


class UserViewSetListCreate(generics.ListCreateAPIView):
    """Manage CustomUser objects via the API."""

    queryset = CustomUser.objects.all().order_by("id")
    authentication_classes = [
        CustomAuthentication,
    ]
    serializer_class = CustomUserSerializer
    permission_classes = [IsAdminUser, IsAuthenticated]

    def post(self, request, *args, **kwargs):
        password = request.data.get("password")
        if password is None or password == "":
            return Response(
                {"password": ["This field is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().post(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)


class UserViewSetRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    """Delete, update and retrieve CustomUser objects via the API by Id."""

    queryset = CustomUser.objects.all().order_by("id")
    authentication_classes = [CustomAuthentication, JWTAuthentication]
    permission_classes = [IsAdminUser, IsAuthenticated]
    serializer_class = CustomUserSerializer
    lookup_field = "pk"


class CookieTokenRefreshView(TokenRefreshView):
    """Refresh access tokens and keep the auth cookie in sync."""

    def post(self, request, *args, **kwargs):

        refresh_token = request.COOKIES.get("refresh_token")

        if not refresh_token:
            return Response(
                {"error": "Refresh token not provided"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)

            response = Response(
                {"message": "Access token token refreshed successfully"},
                status=status.HTTP_200_OK,
            )
            response.set_cookie(
                key=settings.SIMPLE_JWT["AUTH_COOKIE"],
                value=access_token,
                expires=settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"],
                secure=settings.SIMPLE_JWT["AUTH_COOKIE_SECURE"],
                httponly=settings.SIMPLE_JWT["AUTH_COOKIE_HTTP_ONLY"],
                samesite=settings.SIMPLE_JWT["AUTH_COOKIE_SAMESITE"],
            )
            return response

        except InvalidToken:
            return Response(
                {"error": "Invalid token"}, status=status.HTTP_401_UNAUTHORIZED
            )

        except TokenError:
            return Response(
                {"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST
            )


class ProfileView(APIView):
    authentication_classes = [CustomAuthentication, JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = CustomUserSerializer

    def get(self, request, format=None):
        serializer = self.serializer_class(request.user)
        return Response(serializer.data)
