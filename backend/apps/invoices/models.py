from django.conf import settings
from django.db import models

from .validators import validate_pdf_file


class Invoice(models.Model):
    class Status(models.TextChoices):
        PENDING_CONFIRMATION = "pending_confirmation", "Pending Confirmation"
        CONFIRMED = "confirmed", "Confirmed"
        DISPUTED = "disputed", "Disputed"
        APPROVED = "approved", "Approved"
        ADVANCE_PAID = "advance_paid", "Advance Paid"
        SETTLED = "settled", "Settled"

    number = models.CharField(max_length=50)
    supplier = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="supplier_invoices",
        on_delete=models.CASCADE,
        limit_choices_to={"role": "SUPPLIER"},
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="buyer_invoices",
        on_delete=models.CASCADE,
        limit_choices_to={"role": "BUYER"},
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    due_date = models.DateField()
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.PENDING_CONFIRMATION)
    pdf_file = models.FileField(upload_to="invoices/%Y/%m/", validators=[validate_pdf_file])
    goods_description = models.CharField(max_length=255, blank=True)
    purchase_order_number = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["supplier", "number"], name="unique_invoice_number_per_supplier")
        ]

    def __str__(self):
        return f"{self.number} — {self.supplier} → {self.buyer}"


class Dispute(models.Model):
    invoice = models.OneToOneField(Invoice, on_delete=models.CASCADE, related_name="dispute")
    raised_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Dispute on {self.invoice.number}"


class InvoiceAdvance(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        DISBURSED = "disbursed", "Disbursed"
        REPAID = "repaid", "Repaid"

    invoice = models.OneToOneField(Invoice, on_delete=models.CASCADE, related_name="advance")
    advance_amount = models.DecimalField(max_digits=14, decimal_places=2)
    fee_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=5)
    fee_amount = models.DecimalField(max_digits=14, decimal_places=2)
    net_amount = models.DecimalField(max_digits=14, decimal_places=2)
    momo_phone_number = models.CharField(max_length=20, blank=True)
    momo_transaction_id = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    disbursed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Advance on {self.invoice.number} ({self.status})"


class Transaction(models.Model):
    class Kind(models.TextChoices):
        IN = "in", "In"
        OUT = "out", "Out"

    class TransactionType(models.TextChoices):
        ADVANCE = "advance", "Advance"
        FEE = "fee", "Fee"
        REPAYMENT_RECEIVED = "repayment_received", "Repayment Received"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="transactions", on_delete=models.CASCADE)
    invoice = models.ForeignKey(
        Invoice, related_name="transactions", null=True, blank=True, on_delete=models.SET_NULL
    )
    label = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    kind = models.CharField(max_length=3, choices=Kind.choices)
    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.label} ({self.kind} {self.amount})"
