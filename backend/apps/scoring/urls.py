from django.urls import path

from . import views

urlpatterns = [
    path("scoring/invoices/<int:invoice_id>/score/", views.ScoreInvoiceView.as_view(), name="scoring-score"),
    path("scoring/invoices/<int:invoice_id>/", views.RiskScoreDetailView.as_view(), name="scoring-detail"),
]
