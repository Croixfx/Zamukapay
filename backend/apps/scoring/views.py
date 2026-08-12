from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.invoices.models import Invoice
from core.permissions import IsSupplier
from core.response import api_response

from .models import RiskScoreBreakdown
from .serializers import RiskScoreBreakdownSerializer
from .services import RiskScoreService


class ScoreInvoiceView(APIView):
    """Triggers scoring for an invoice the requesting supplier owns.

    Only callable once the buyer has confirmed the invoice — scoring (and the
    advance it unlocks) must happen after confirmation, not before."""

    permission_classes = [IsAuthenticated, IsSupplier]

    def post(self, request, invoice_id):
        invoice = get_object_or_404(Invoice, pk=invoice_id, supplier=request.user)
        if invoice.status != Invoice.Status.CONFIRMED:
            return api_response(
                success=False,
                message="Invoice must be confirmed by the buyer before it can be scored.",
                status_code=400,
            )

        breakdown = RiskScoreService.score_invoice(invoice.id)

        if breakdown.recommendation != RiskScoreBreakdown.Recommendation.DECLINE:
            invoice.status = Invoice.Status.APPROVED
            invoice.save(update_fields=["status", "updated_at"])

        return api_response(data=RiskScoreBreakdownSerializer(breakdown).data, message="Invoice scored.")


class RiskScoreDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, invoice_id):
        invoice = get_object_or_404(Invoice, pk=invoice_id)
        is_party = request.user.id in (invoice.supplier_id, invoice.buyer_id)
        if not is_party and request.user.role != "ADMIN":
            raise PermissionDenied("You cannot view this invoice's risk score.")

        breakdown = get_object_or_404(RiskScoreBreakdown, invoice=invoice)
        return api_response(data=RiskScoreBreakdownSerializer(breakdown).data)
