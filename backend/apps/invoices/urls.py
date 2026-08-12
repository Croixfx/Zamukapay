from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminDashboardView,
    AdminInvoiceListView,
    InvoiceViewSet,
    SettleAdvanceView,
    TransactionViewSet,
)

router = DefaultRouter()
router.register("invoices", InvoiceViewSet, basename="invoice")
router.register("transactions", TransactionViewSet, basename="transaction")

urlpatterns = [
    path("advances/<int:advance_id>/settle/", SettleAdvanceView.as_view(), name="advance-settle"),
    path("admin/dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("admin/invoices/", AdminInvoiceListView.as_view(), name="admin-invoices"),
] + router.urls
