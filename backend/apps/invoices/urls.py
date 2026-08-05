from rest_framework.routers import DefaultRouter

from .views import InvoiceViewSet, TransactionViewSet

router = DefaultRouter()
router.register("invoices", InvoiceViewSet, basename="invoice")
router.register("transactions", TransactionViewSet, basename="transaction")

urlpatterns = router.urls
