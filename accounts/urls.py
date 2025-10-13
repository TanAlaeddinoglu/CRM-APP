from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.routers import DefaultRouter

from .views import CookieTokenRefreshView, UserLoginView, ProfileView, UserViewSetListCreate, UserViewSetRetrieveUpdateDestroy


urlpatterns = [
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", CookieTokenRefreshView.as_view(), name="token_refresh"),
    path("login/", UserLoginView.as_view(), name="login-user"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("users/<int:pk>/", UserViewSetRetrieveUpdateDestroy.as_view(), name="user-detail"),
    path("users/", UserViewSetListCreate.as_view(), name="user-list-create"),
]
