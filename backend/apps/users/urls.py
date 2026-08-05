from django.urls import path
from rest_framework_simplejwt.views import TokenVerifyView

from . import views

urlpatterns = [
    path("auth/register/", views.RegisterView.as_view(), name="auth-register"),
    path("auth/login/", views.LoginView.as_view(), name="auth-login"),
    path("auth/logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("auth/token/refresh/", views.CookieTokenRefreshView.as_view(), name="auth-token-refresh"),
    path("auth/token/verify/", TokenVerifyView.as_view(), name="auth-token-verify"),
    path("auth/me/", views.MeView.as_view(), name="auth-me"),
    path("users/buyers/", views.BuyersListView.as_view(), name="users-buyers"),
]
