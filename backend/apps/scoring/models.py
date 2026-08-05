from django.db import models

from apps.invoices.models import Invoice


class RiskScoreBreakdown(models.Model):
    class Recommendation(models.TextChoices):
        APPROVE = "APPROVE", "Approve"
        REVIEW = "REVIEW", "Review"
        DECLINE = "DECLINE", "Decline"

    invoice = models.OneToOneField(Invoice, on_delete=models.CASCADE, related_name="risk_score")

    # One field pair per check shown on the AI Risk Scoring screen.
    buyer_payment_history_score = models.PositiveSmallIntegerField()
    buyer_payment_history_label = models.CharField(max_length=50)

    relationship_age_months = models.PositiveIntegerField()
    relationship_age_score = models.PositiveSmallIntegerField()

    invoice_vs_average_score = models.PositiveSmallIntegerField()
    invoice_vs_average_label = models.CharField(max_length=50)

    buyer_verification_score = models.PositiveSmallIntegerField()
    buyer_verification_label = models.CharField(max_length=50)

    overall_score = models.PositiveSmallIntegerField()
    recommendation = models.CharField(max_length=10, choices=Recommendation.choices)

    advance_amount = models.DecimalField(max_digits=14, decimal_places=2)
    fee_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    fee_amount = models.DecimalField(max_digits=14, decimal_places=2)
    net_amount = models.DecimalField(max_digits=14, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Risk score for {self.invoice.number}: {self.overall_score}/100"
