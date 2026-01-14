from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework_simplejwt.exceptions import (
    TokenError,
    InvalidToken,
)

from django.http import JsonResponse
from django.middleware.csrf import get_token
from rest_framework_simplejwt.views import TokenRefreshView
from djangoCRM import settings

from .authenticate import CustomAuthentication, enforce_csrf
from .serializers import CustomUserSerializer, UserLoginSerializer
from .models import CustomUser
from .throttling import (
    reset_login_attempts,
    increase_login_attempt,
    check_login_throttle,
)

from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)

    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


@method_decorator(csrf_exempt, name="dispatch")
class UserLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, format=None):
        enforce_csrf(request)

        identifier = request.data.get("email") or request.data.get("username")
        if not identifier:
            raise AuthenticationFailed("Email or username is required.")

        # 🔐 throttle kontrolü (BURASI DOĞRU)
        check_login_throttle(identifier)

        serializer = UserLoginSerializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data
        except (ValidationError, AuthenticationFailed):
            increase_login_attempt(identifier)
            attempts = cache.get(f"login_attempts:{identifier}")
            logger.warning(f"LOGIN ATTEMPTS [{identifier}]: {attempts}")
            raise AuthenticationFailed("Incorrect credentials.")

        if not user:
            increase_login_attempt(identifier)
            raise AuthenticationFailed("Incorrect credentials.")

        # ✅ başarılı login → reset
        reset_login_attempts(identifier)

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


@method_decorator(csrf_exempt, name="dispatch")
class LogoutView(APIView):
    def post(self, request, format=None):
        # enforce_csrf(request)
        refresh_cookie_name = settings.SIMPLE_JWT["AUTH_COOKIE_REFRESH_TOKEN"]
        refresh_token = request.COOKIES.get(refresh_cookie_name)

        if refresh_token:
            try:
                refresh = RefreshToken(refresh_token)
                refresh.blacklist()
            except TokenError as exc:
                raise AuthenticationFailed("Invalid refresh token.") from exc

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
            raise ValidationError({"password": ["This field is required."]})

        return super().post(request, *args, **kwargs)


class UserViewSetRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    queryset = CustomUser.objects.all().order_by("id")
    serializer_class = CustomUserSerializer

    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    lookup_field = "pk"

    def get_permissions(self):
        perms = super().get_permissions()
        print("PERMISSIONS:", perms)
        return perms

    def check_permissions(self, request):
        print(
            "CHECK PERMISSIONS:",
            request.user,
            request.user.is_authenticated,
            request.user.is_staff,
        )
        return super().check_permissions(request)


class CookieTokenRefreshView(TokenRefreshView):
    """Refresh access tokens and keep the auth cookie in sync."""

    def post(self, request, *args, **kwargs):

        refresh_token = request.COOKIES.get("refresh_token")

        if not refresh_token:
            raise AuthenticationFailed("Refresh token not provided.")

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

        except InvalidToken as exc:
            raise AuthenticationFailed("Invalid token.") from exc

        except TokenError as exc:
            raise AuthenticationFailed("Invalid token.") from exc


class ProfileView(APIView):
    authentication_classes = [CustomAuthentication, JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = CustomUserSerializer

    def get(self, request, format=None):
        serializer = self.serializer_class(request.user)
        return Response(serializer.data)


def csrf_token_view(request):
    return JsonResponse({"csrfToken": get_token(request)})
