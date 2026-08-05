from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from core.mixins import StandardResponseMixin
from core.response import api_response

from .serializers import BuyerSerializer, LoginSerializer, RegisterSerializer, UserSerializer

User = get_user_model()


def _set_refresh_cookie(response, refresh_token):
    response.set_cookie(
        key=settings.REFRESH_TOKEN_COOKIE_NAME,
        value=str(refresh_token),
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        httponly=True,
        secure=settings.REFRESH_TOKEN_COOKIE_SECURE,
        samesite=settings.REFRESH_TOKEN_COOKIE_SAMESITE,
        path=settings.REFRESH_TOKEN_COOKIE_PATH,
    )


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_scope = "register"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        response = api_response(
            data={"user": UserSerializer(user).data, "access": str(refresh.access_token)},
            message="Account created.",
            status_code=status.HTTP_201_CREATED,
        )
        _set_refresh_cookie(response, refresh)
        return response


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]
    throttle_scope = "login"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        response = api_response(
            data={"user": validated["user"], "access": validated["access"]},
            message="Signed in.",
        )
        _set_refresh_cookie(response, validated["refresh"])
        return response


class CookieTokenRefreshView(APIView):
    """Reads the refresh token from the httpOnly cookie instead of the body,
    rotates it (per SIMPLE_JWT settings), and re-sets the cookie."""

    permission_classes = [AllowAny]
    throttle_scope = "token_refresh"

    def post(self, request, *args, **kwargs):
        raw_refresh = request.COOKIES.get(settings.REFRESH_TOKEN_COOKIE_NAME)
        if not raw_refresh:
            return api_response(
                success=False,
                message="Refresh token missing.",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = TokenRefreshSerializer(data={"refresh": raw_refresh})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError:
            return api_response(
                success=False,
                message="Refresh token invalid or expired.",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        access = serializer.validated_data["access"]
        rotated_refresh = serializer.validated_data.get("refresh")

        response = api_response(data={"access": access}, message="Token refreshed.")
        if rotated_refresh:
            _set_refresh_cookie(response, rotated_refresh)
        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        raw_refresh = request.COOKIES.get(settings.REFRESH_TOKEN_COOKIE_NAME)
        if raw_refresh:
            try:
                RefreshToken(raw_refresh).blacklist()
            except TokenError:
                pass

        response = api_response(message="Signed out.")
        response.delete_cookie(settings.REFRESH_TOKEN_COOKIE_NAME, path=settings.REFRESH_TOKEN_COOKIE_PATH)
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return api_response(data=UserSerializer(request.user).data)


class BuyersListView(StandardResponseMixin, generics.ListAPIView):
    """Populates the buyer dropdown on the invoice submission form."""

    serializer_class = BuyerSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return User.objects.filter(role=User.Role.BUYER).order_by("company_name")
