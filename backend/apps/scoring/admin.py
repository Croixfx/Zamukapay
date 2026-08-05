from django.contrib import admin

from .models import RiskScoreBreakdown


@admin.register(RiskScoreBreakdown)
class RiskScoreBreakdownAdmin(admin.ModelAdmin):
    list_display = ["invoice", "overall_score", "recommendation", "advance_amount", "created_at"]
    list_filter = ["recommendation"]
