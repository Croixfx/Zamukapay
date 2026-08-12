from django.db.models import Count, Sum
from django.shortcuts import get_object_or_404
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.scoring.models import RiskScoreBreakdown
from core.mixins import StandardResponseMixin
from core.permissions import IsAdminRole, IsBuyer, IsSupplier
from core.response import api_response

from .models import Dispute, Invoice, InvoiceAdvance, Transaction
from .serializers import (
    AdminInvoiceRowSerializer,
    InvoiceCreateSerializer,
    InvoiceDetailSerializer,
    InvoiceDisputeSerializer,
    InvoiceListSerializer,
    TransactionSerializer,
)


class InvoiceViewSet(StandardResponseMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        qs = Invoice.objects.select_related("supplier", "buyer", "advance", "dispute")
        if user.role == "SUPPLIER":
            return qs.filter(supplier=user)
        if user.role == "BUYER":
            return qs.filter(buyer=user)
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return InvoiceCreateSerializer
        if self.action == "list":
            return InvoiceListSerializer
        return InvoiceDetailSerializer

    def perform_create(self, serializer):
        if self.request.user.role != "SUPPLIER":
            raise PermissionDenied("Only suppliers can submit invoices.")
        serializer.save()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        response = api_response(
            data=InvoiceDetailSerializer(serializer.instance).data,
            message="Invoice submitted.",
            status_code=201,
        )
        return response

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsBuyer])
    def confirm(self, request, pk=None):
        invoice = self.get_object()
        if invoice.buyer_id != request.user.id:
            raise PermissionDenied("This invoice was not issued to you.")
        if invoice.status != Invoice.Status.PENDING_CONFIRMATION:
            return api_response(success=False, message="Invoice is not pending confirmation.", status_code=400)

        invoice.status = Invoice.Status.CONFIRMED
        invoice.save(update_fields=["status", "updated_at"])
        return api_response(data=InvoiceDetailSerializer(invoice).data, message="Invoice confirmed.")

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsBuyer])
    def dispute(self, request, pk=None):
        invoice = self.get_object()
        if invoice.buyer_id != request.user.id:
            raise PermissionDenied("This invoice was not issued to you.")
        if invoice.status != Invoice.Status.PENDING_CONFIRMATION:
            return api_response(success=False, message="Invoice is not pending confirmation.", status_code=400)

        serializer = InvoiceDisputeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        Dispute.objects.update_or_create(
            invoice=invoice,
            defaults={"raised_by": request.user, "reason": serializer.validated_data.get("reason", "")},
        )
        invoice.status = Invoice.Status.DISPUTED
        invoice.save(update_fields=["status", "updated_at"])
        return api_response(data=InvoiceDetailSerializer(invoice).data, message="Dispute raised.")

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsBuyer])
    def pending(self, request):
        qs = self.get_queryset().filter(status=Invoice.Status.PENDING_CONFIRMATION)
        return api_response(data=InvoiceListSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsSupplier])
    def stats(self, request):
        user = request.user
        invoices = Invoice.objects.filter(supplier=user)
        pending_invoices = invoices.filter(status=Invoice.Status.PENDING_CONFIRMATION)
        disbursed_advances = InvoiceAdvance.objects.filter(
            invoice__supplier=user, status=InvoiceAdvance.Status.DISBURSED
        )
        settled_advances = InvoiceAdvance.objects.filter(
            invoice__supplier=user, status__in=[InvoiceAdvance.Status.DISBURSED, InvoiceAdvance.Status.REPAID]
        )

        data = {
            "total_advances_received": settled_advances.aggregate(total=Sum("net_amount"))["total"] or 0,
            "total_advances_count": settled_advances.count(),
            "pending_invoices_count": pending_invoices.count(),
            "pending_invoices_amount": pending_invoices.aggregate(total=Sum("amount"))["total"] or 0,
            "active_advances_count": disbursed_advances.count(),
            "active_advances_amount": disbursed_advances.aggregate(total=Sum("advance_amount"))["total"] or 0,
        }
        return api_response(data=data)


class TransactionViewSet(StandardResponseMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user)


class SettleAdvanceView(APIView):
    """Simulates the buyer repaying ZamukaPay on the invoice's due date."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, advance_id):
        advance = get_object_or_404(InvoiceAdvance, pk=advance_id)
        if advance.status != InvoiceAdvance.Status.DISBURSED:
            return api_response(success=False, message="Advance is not currently disbursed.", status_code=400)

        advance.status = InvoiceAdvance.Status.REPAID
        advance.save(update_fields=["status"])

        invoice = advance.invoice
        Transaction.objects.create(
            user=invoice.buyer,
            invoice=invoice,
            label=f"Repayment received — {invoice.number}",
            amount=invoice.amount,
            kind=Transaction.Kind.OUT,
            transaction_type=Transaction.TransactionType.REPAYMENT_RECEIVED,
        )

        invoice.status = Invoice.Status.SETTLED
        invoice.save(update_fields=["status", "updated_at"])

        return api_response(data=InvoiceDetailSerializer(invoice).data, message="Advance settled.")


class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        settled_or_disbursed = InvoiceAdvance.objects.filter(
            status__in=[InvoiceAdvance.Status.DISBURSED, InvoiceAdvance.Status.REPAID]
        )
        recent_invoices = (
            Invoice.objects.select_related("supplier", "buyer", "advance", "risk_score")
            .order_by("-created_at")[:8]
        )

        distribution = dict(
            RiskScoreBreakdown.objects.values_list("recommendation").annotate(count=Count("id"))
        )
        risk_distribution = {
            choice: distribution.get(choice, 0) for choice in RiskScoreBreakdown.Recommendation.values
        }

        data = {
            "total_invoices": Invoice.objects.count(),
            "total_advanced_rwf": settled_or_disbursed.aggregate(total=Sum("advance_amount"))["total"] or 0,
            "total_fees_collected_rwf": settled_or_disbursed.aggregate(total=Sum("fee_amount"))["total"] or 0,
            "active_advances": InvoiceAdvance.objects.filter(status=InvoiceAdvance.Status.DISBURSED).count(),
            "settled_advances": InvoiceAdvance.objects.filter(status=InvoiceAdvance.Status.REPAID).count(),
            "pending_confirmation": Invoice.objects.filter(
                status=Invoice.Status.PENDING_CONFIRMATION
            ).count(),
            "recent_invoices": AdminInvoiceRowSerializer(recent_invoices, many=True).data,
            "risk_distribution": risk_distribution,
        }
        return api_response(data=data)


class AdminInvoiceListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        qs = (
            Invoice.objects.select_related("supplier", "buyer", "advance", "risk_score")
            .order_by("-created_at")
        )

        status_param = request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        date_from = request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)

        date_to = request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        return api_response(data=AdminInvoiceRowSerializer(qs, many=True).data)
