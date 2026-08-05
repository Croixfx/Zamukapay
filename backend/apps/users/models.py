from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    class Role(models.TextChoices):
        SUPPLIER = "SUPPLIER", "Supplier"
        BUYER = "BUYER", "Buyer"
        ADMIN = "ADMIN", "Admin"

    username = None
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=Role.choices)
    company_name = models.CharField(max_length=255)
    phone_number = models.CharField(
        max_length=20, blank=True, help_text="MTN MoMo number, e.g. +250788412907"
    )
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["company_name", "role"]

    objects = UserManager()

    def __str__(self):
        return f"{self.company_name} <{self.email}>"
