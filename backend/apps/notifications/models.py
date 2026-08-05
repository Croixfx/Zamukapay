from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        MOMO_PAYOUT = "momo_payout", "MoMo Payout"
        INVOICE_CONFIRMED = "invoice_confirmed", "Invoice Confirmed"
        INVOICE_DISPUTED = "invoice_disputed", "Invoice Disputed"
        ADVANCE_APPROVED = "advance_approved", "Advance Approved"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="notifications", on_delete=models.CASCADE)
    type = models.CharField(max_length=30, choices=Type.choices)
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.type} -> {self.user}"
