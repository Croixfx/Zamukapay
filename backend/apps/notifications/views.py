from django.shortcuts import get_object_or_404
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.invoices.models import Invoice
from core.mixins import StandardResponseMixin
from core.permissions import IsSupplier
from core.response import api_response

from .models import Notification
from .serializers import NotificationSerializer
from .services import MoMoPayoutService


class MomoPayoutView(APIView):
    """Backs the 'Confirm & Receive via MoMo' button on the risk score screen
    and the receipt fields shown on the payout confirmation screen."""

    permission_classes = [IsAuthenticated, IsSupplier]

    def post(self, request, invoice_id):
        invoice = get_object_or_404(Invoice, pk=invoice_id, supplier=request.user)
        try:
            advance = MoMoPayoutService.send_payout(invoice)
        except ValueError as exc:
            return api_response(success=False, message=str(exc), status_code=400)

        data = {
            "phone_number": advance.momo_phone_number,
            "amount_sent": advance.net_amount,
            "transaction_id": advance.momo_transaction_id,
            "timestamp": advance.disbursed_at,
            "invoice_number": invoice.number,
            "buyer": invoice.buyer.company_name,
        }
        return api_response(data=data, message="Payout sent.")


class NotificationViewSet(StandardResponseMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)[:10]

    @action(detail=False, methods=["post"], url_path="mark-read")
    def mark_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return api_response(message="Notifications marked as read.")
