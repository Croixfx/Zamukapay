from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("notifications", views.NotificationViewSet, basename="notification")

urlpatterns = [
    path("notifications/payout/<int:invoice_id>/", views.MomoPayoutView.as_view(), name="momo-payout"),
] + router.urls
