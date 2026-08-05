from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "role",
            "company_name",
            "phone_number",
            "is_verified",
            "created_at",
        ]
        read_only_fields = ["id", "is_verified", "created_at"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    role = serializers.ChoiceField(choices=[User.Role.SUPPLIER, User.Role.BUYER])

    class Meta:
        model = User
        fields = ["email", "password", "role", "company_name", "phone_number"]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class BuyerSerializer(serializers.ModelSerializer):
    """Slim representation used to populate the buyer dropdown on invoice submission."""

    class Meta:
        model = User
        fields = ["id", "company_name", "is_verified"]


class LoginSerializer(TokenObtainPairSerializer):
    """Same as TokenObtainPairSerializer, plus the user profile in the payload."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data
