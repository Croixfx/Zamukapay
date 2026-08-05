from rest_framework import serializers

from .models import RiskScoreBreakdown


class RiskScoreBreakdownSerializer(serializers.ModelSerializer):
    """`checks` mirrors the CHECKS array the frontend animates through on
    the AI Risk Scoring screen (src/routes/risk-score.tsx)."""

    checks = serializers.SerializerMethodField()

    class Meta:
        model = RiskScoreBreakdown
        fields = [
            "overall_score",
            "recommendation",
            "advance_amount",
            "fee_percentage",
            "fee_amount",
            "net_amount",
            "checks",
            "created_at",
        ]

    def get_checks(self, obj):
        return [
            {"label": "Buyer payment history", "result": obj.buyer_payment_history_label},
            {"label": "Relationship age", "result": f"{obj.relationship_age_months} months"},
            {"label": "Invoice vs average", "result": obj.invoice_vs_average_label},
            {"label": "Buyer verification", "result": obj.buyer_verification_label},
        ]
