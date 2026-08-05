from decimal import Decimal

from django.db.models import Avg
from django.utils import timezone

from apps.invoices.models import Invoice

from .models import RiskScoreBreakdown


def _buyer_payment_history(buyer):
    """Max 35 pts — share of the buyer's past invoices that were honored."""
    past = Invoice.objects.filter(buyer=buyer).exclude(status=Invoice.Status.PENDING)
    total = past.count()
    if total == 0:
        return 25, "New buyer"

    honored = past.filter(status__in=[Invoice.Status.CONFIRMED, Invoice.Status.ADVANCED]).count()
    ratio = honored / total
    score = round(ratio * 35)

    if ratio >= 0.9:
        label = "Excellent"
    elif ratio >= 0.7:
        label = "Good"
    elif ratio >= 0.4:
        label = "Fair"
    else:
        label = "Poor"
    return score, label


def _relationship_age(supplier, buyer):
    """Max 20 pts — how long this supplier/buyer pair has been trading, scaled up to 12 months."""
    earliest = Invoice.objects.filter(supplier=supplier, buyer=buyer).order_by("created_at").first()
    if earliest is None:
        return 0, 0

    months = max(0, (timezone.now().date() - earliest.created_at.date()).days // 30)
    score = min(20, round((months / 12) * 20))
    return months, score


def _invoice_vs_average(supplier, amount, exclude_invoice_id=None):
    """Max 20 pts — how far this invoice sits from the supplier's historical average."""
    qs = Invoice.objects.filter(supplier=supplier)
    if exclude_invoice_id:
        qs = qs.exclude(pk=exclude_invoice_id)
    average = qs.aggregate(avg=Avg("amount"))["avg"]

    if not average:
        return 20, "Normal range"

    ratio = float(amount) / float(average)
    if 0.5 <= ratio <= 1.5:
        return 20, "Normal range"
    if 0.25 <= ratio <= 2.0:
        return 12, "Above average" if ratio > 1 else "Below average"
    return 5, "Unusual"


def _buyer_verification(buyer):
    """Max 25 pts — verified buyers carry far less counterparty risk."""
    return (25, "Confirmed") if buyer.is_verified else (10, "Unverified")


class RiskScoreService:
    """Rule-based weighted scorer — a placeholder for a future ML model.

    Weights: payment history 35 + relationship age 20 + invoice-vs-average 20
    + buyer verification 25 = 100 max. Recommendation tiers drive the advance
    rate and fee percentage offered to the supplier.
    """

    @staticmethod
    def score_invoice(invoice_id) -> RiskScoreBreakdown:
        invoice = Invoice.objects.select_related("supplier", "buyer").get(pk=invoice_id)

        history_score, history_label = _buyer_payment_history(invoice.buyer)
        age_months, age_score = _relationship_age(invoice.supplier, invoice.buyer)
        avg_score, avg_label = _invoice_vs_average(invoice.supplier, invoice.amount, exclude_invoice_id=invoice.id)
        verify_score, verify_label = _buyer_verification(invoice.buyer)

        overall = min(100, history_score + age_score + avg_score + verify_score)

        if overall >= 70:
            recommendation = RiskScoreBreakdown.Recommendation.APPROVE
            advance_rate = Decimal("0.8")
            fee_percentage = Decimal("4") if overall >= 90 else Decimal("5")
        elif overall >= 40:
            recommendation = RiskScoreBreakdown.Recommendation.REVIEW
            advance_rate = Decimal("0.5")
            fee_percentage = Decimal("7")
        else:
            recommendation = RiskScoreBreakdown.Recommendation.DECLINE
            advance_rate = Decimal("0")
            fee_percentage = Decimal("0")

        advance_amount = (invoice.amount * advance_rate).quantize(Decimal("1"))
        fee_amount = (advance_amount * fee_percentage / 100).quantize(Decimal("1"))
        net_amount = advance_amount - fee_amount

        breakdown, _ = RiskScoreBreakdown.objects.update_or_create(
            invoice=invoice,
            defaults={
                "buyer_payment_history_score": history_score,
                "buyer_payment_history_label": history_label,
                "relationship_age_months": age_months,
                "relationship_age_score": age_score,
                "invoice_vs_average_score": avg_score,
                "invoice_vs_average_label": avg_label,
                "buyer_verification_score": verify_score,
                "buyer_verification_label": verify_label,
                "overall_score": overall,
                "recommendation": recommendation,
                "advance_amount": advance_amount,
                "fee_percentage": fee_percentage,
                "fee_amount": fee_amount,
                "net_amount": net_amount,
            },
        )
        return breakdown
