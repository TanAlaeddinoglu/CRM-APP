from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView

from .views import (
    CookieTokenRefreshView,
    UserLoginView,
    ProfileView,
    UserViewSetListCreate,
    UserViewSetRetrieveUpdateDestroy,
    LogoutView,
    csrf_token_view,
)


urlpatterns = [
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", CookieTokenRefreshView.as_view(), name="token_refresh"),
    path("login/", UserLoginView.as_view(), name="login-user"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("logout/", LogoutView.as_view(), name="logout-user"),
    path(
        "users/<int:pk>/",
        UserViewSetRetrieveUpdateDestroy.as_view(),
        name="user-detail",
    ),
    path("users/", UserViewSetListCreate.as_view(), name="user-list-create"),
    path("csrf/", csrf_token_view, name="csrf"),
]
