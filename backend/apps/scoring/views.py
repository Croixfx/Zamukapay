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
    """Triggers scoring for an invoice the requesting supplier owns."""

    permission_classes = [IsAuthenticated, IsSupplier]

    def post(self, request, invoice_id):
        invoice = get_object_or_404(Invoice, pk=invoice_id, supplier=request.user)
        breakdown = RiskScoreService.score_invoice(invoice.id)
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
