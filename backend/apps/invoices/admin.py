from django.contrib import admin

from .models import Dispute, Invoice, InvoiceAdvance, Transaction


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["number", "supplier", "buyer", "amount", "due_date", "status"]
    list_filter = ["status"]
    search_fields = ["number", "supplier__company_name", "buyer__company_name"]


@admin.register(InvoiceAdvance)
class InvoiceAdvanceAdmin(admin.ModelAdmin):
    list_display = ["invoice", "advance_amount", "fee_amount", "net_amount", "status", "disbursed_at"]
    list_filter = ["status"]


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ["user", "label", "amount", "kind", "transaction_type", "created_at"]
    list_filter = ["kind", "transaction_type"]


@admin.register(Dispute)
class DisputeAdmin(admin.ModelAdmin):
    list_display = ["invoice", "raised_by", "created_at"]
