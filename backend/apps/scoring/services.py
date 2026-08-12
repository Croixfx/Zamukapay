import json
from decimal import Decimal
from pathlib import Path

import joblib
from django.db.models import Avg
from django.utils import timezone

from apps.invoices.models import Invoice, Transaction

from .models import RiskScoreBreakdown

# ---------------------------------------------------------------------------
# Model artifacts are loaded once at import time (module scope), not per
# request. Both files come from ZamukaPay_AI_Scoring.ipynb section 6.
# ---------------------------------------------------------------------------
ML_DIR = Path(__file__).resolve().parent / "ml"

_MODEL = joblib.load(ML_DIR / "zamukapay_scorer.joblib")
with open(ML_DIR / "zamukapay_scorer_meta.json") as _f:
    _META = json.load(_f)

FEATURES = _META["features"]
THRESHOLDS = _META["thresholds"]
ADVANCE_PCTS = _META["advance_pcts"]
FEE_PCTS = _META["fee_pcts"]


def _buyer_payment_rate(buyer):
    """Share of the buyer's past invoices that were honored (not disputed)."""
    past = Invoice.objects.filter(buyer=buyer).exclude(status=Invoice.Status.PENDING_CONFIRMATION)
    total = past.count()
    if total == 0:
        return 0.6  # neutral prior for a brand new buyer

    honored = past.filter(
        status__in=[
            Invoice.Status.CONFIRMED,
            Invoice.Status.APPROVED,
            Invoice.Status.ADVANCE_PAID,
            Invoice.Status.SETTLED,
        ]
    ).count()
    return honored / total


def _relationship_months(supplier, buyer):
    earliest = Invoice.objects.filter(supplier=supplier, buyer=buyer).order_by("created_at").first()
    if earliest is None:
        return 0
    return max(0, (timezone.now().date() - earliest.created_at.date()).days // 30)


def _invoice_vs_avg(supplier, amount, exclude_invoice_id=None):
    qs = Invoice.objects.filter(supplier=supplier)
    if exclude_invoice_id:
        qs = qs.exclude(pk=exclude_invoice_id)
    average = qs.aggregate(avg=Avg("amount"))["avg"]
    if not average:
        return 1.0
    return float(amount) / float(average)


def _prior_invoices(supplier, buyer, exclude_invoice_id=None):
    qs = Invoice.objects.filter(supplier=supplier, buyer=buyer)
    if exclude_invoice_id:
        qs = qs.exclude(pk=exclude_invoice_id)
    return qs.count()


def _avg_days_late(buyer):
    """Average (repayment transaction date - due_date) across the buyer's settled invoices."""
    settled = Invoice.objects.filter(buyer=buyer, status=Invoice.Status.SETTLED)
    deltas = []
    for invoice in settled:
        repayment = (
            invoice.transactions.filter(transaction_type=Transaction.TransactionType.REPAYMENT_RECEIVED)
            .order_by("-created_at")
            .first()
        )
        if repayment:
            deltas.append((repayment.created_at.date() - invoice.due_date).days)
    if not deltas:
        return 0.0
    return sum(deltas) / len(deltas)


def _display_breakdown(buyer_payment_rate, relationship_months, invoice_vs_avg, buyer_verified):
    """Per-factor scores/labels shown on the animated scoring screen.

    Mirrors the breakdown() helper in ZamukaPay_AI_Scoring.ipynb section 4 —
    these are for display only; the actual APPROVE/REVIEW/DECLINE decision
    comes from the trained model's predict_proba(), not these sub-scores.
    """
    history_score = round(buyer_payment_rate * 35)
    if buyer_payment_rate > 0.85:
        history_label = "Excellent"
    elif buyer_payment_rate > 0.65:
        history_label = "Good"
    else:
        history_label = "Poor"

    age_score = round(min(relationship_months / 48, 1) * 20)

    avg_score = round(max(0, 1 - (invoice_vs_avg - 1) * 0.4) * 20)
    avg_label = "Normal range" if invoice_vs_avg < 1.5 else "Unusually large"

    verify_score = round(buyer_verified * 25)
    verify_label = "Verified" if buyer_verified else "Unverified"

    return {
        "buyer_payment_history_score": history_score,
        "buyer_payment_history_label": history_label,
        "relationship_age_score": age_score,
        "invoice_vs_average_score": avg_score,
        "invoice_vs_average_label": avg_label,
        "buyer_verification_score": verify_score,
        "buyer_verification_label": verify_label,
    }


class RiskScoreService:
    """ML-backed scorer — loads the RandomForestClassifier trained in
    ZamukaPay_AI_Scoring.ipynb and scores invoices with predict_proba()."""

    @staticmethod
    def score_invoice(invoice_id) -> RiskScoreBreakdown:
        invoice = Invoice.objects.select_related("supplier", "buyer").get(pk=invoice_id)

        buyer_payment_rate = _buyer_payment_rate(invoice.buyer)
        relationship_months = _relationship_months(invoice.supplier, invoice.buyer)
        invoice_vs_avg = _invoice_vs_avg(invoice.supplier, invoice.amount, exclude_invoice_id=invoice.id)
        buyer_verified = 1 if invoice.buyer.is_verified else 0
        days_to_due = (invoice.due_date - timezone.now().date()).days
        prior_invoices = _prior_invoices(invoice.supplier, invoice.buyer, exclude_invoice_id=invoice.id)
        avg_days_late = _avg_days_late(invoice.buyer)

        feature_values = {
            "buyer_payment_rate": buyer_payment_rate,
            "relationship_months": relationship_months,
            "invoice_vs_avg": invoice_vs_avg,
            "buyer_verified": buyer_verified,
            "days_to_due": days_to_due,
            "prior_invoices": prior_invoices,
            "avg_days_late": avg_days_late,
        }
        ordered_features = [[feature_values[name] for name in FEATURES]]

        repay_prob = _MODEL.predict_proba(ordered_features)[0][1]
        overall = max(0, min(100, round(repay_prob * 100)))

        if overall >= THRESHOLDS["APPROVE"]:
            recommendation = RiskScoreBreakdown.Recommendation.APPROVE
        elif overall >= THRESHOLDS["REVIEW"]:
            recommendation = RiskScoreBreakdown.Recommendation.REVIEW
        else:
            recommendation = RiskScoreBreakdown.Recommendation.DECLINE

        advance_rate = Decimal(str(ADVANCE_PCTS[recommendation]))
        fee_percentage = Decimal(str(FEE_PCTS[recommendation] * 100))

        advance_amount = (invoice.amount * advance_rate).quantize(Decimal("1"))
        fee_amount = (advance_amount * fee_percentage / 100).quantize(Decimal("1"))
        net_amount = advance_amount - fee_amount

        breakdown_fields = _display_breakdown(
            buyer_payment_rate, relationship_months, invoice_vs_avg, buyer_verified
        )

        breakdown, _ = RiskScoreBreakdown.objects.update_or_create(
            invoice=invoice,
            defaults={
                **breakdown_fields,
                "relationship_age_months": relationship_months,
                "overall_score": overall,
                "recommendation": recommendation,
                "advance_amount": advance_amount,
                "fee_percentage": fee_percentage,
                "fee_amount": fee_amount,
                "net_amount": net_amount,
            },
        )
        return breakdown
