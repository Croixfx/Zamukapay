from rest_framework import serializers

from .models import Dispute, Invoice, InvoiceAdvance, Transaction
from .validators import validate_pdf_file


class InvoiceAdvanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceAdvance
        fields = [
            "advance_amount",
            "fee_percentage",
            "fee_amount",
            "net_amount",
            "momo_phone_number",
            "momo_transaction_id",
            "status",
            "disbursed_at",
        ]


class DisputeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dispute
        fields = ["reason", "created_at"]


class InvoiceListSerializer(serializers.ModelSerializer):
    """Mirrors the frontend Invoice type in src/lib/zamuka-data.ts exactly."""

    buyer = serializers.CharField(source="buyer.company_name", read_only=True)
    supplier = serializers.CharField(source="supplier.company_name", read_only=True)
    dueDate = serializers.DateField(source="due_date", read_only=True)

    class Meta:
        model = Invoice
        fields = ["id", "number", "buyer", "supplier", "amount", "dueDate", "status"]


class InvoiceDetailSerializer(InvoiceListSerializer):
    buyer_id = serializers.IntegerField(source="buyer.id", read_only=True)
    supplier_id = serializers.IntegerField(source="supplier.id", read_only=True)
    advance = InvoiceAdvanceSerializer(read_only=True)
    dispute = DisputeSerializer(read_only=True)

    class Meta(InvoiceListSerializer.Meta):
        fields = InvoiceListSerializer.Meta.fields + [
            "buyer_id",
            "supplier_id",
            "goods_description",
            "purchase_order_number",
            "pdf_file",
            "advance",
            "dispute",
            "created_at",
        ]


class InvoiceCreateSerializer(serializers.ModelSerializer):
    pdf_file = serializers.FileField(validators=[validate_pdf_file])

    class Meta:
        model = Invoice
        fields = [
            "id",
            "number",
            "buyer",
            "amount",
            "due_date",
            "pdf_file",
            "goods_description",
            "purchase_order_number",
        ]

    def validate_buyer(self, buyer):
        if buyer.role != "BUYER":
            raise serializers.ValidationError("Selected account is not a buyer.")
        return buyer

    def validate_amount(self, amount):
        if amount <= 0:
            raise serializers.ValidationError("Invoice amount must be greater than zero.")
        return amount

    def validate_number(self, number):
        supplier = self.context["request"].user
        if Invoice.objects.filter(supplier=supplier, number=number).exists():
            raise serializers.ValidationError("You already have an invoice with this number.")
        return number

    def create(self, validated_data):
        validated_data["supplier"] = self.context["request"].user
        return super().create(validated_data)


class InvoiceDisputeSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class TransactionSerializer(serializers.ModelSerializer):
    label = serializers.CharField(read_only=True)
    date = serializers.DateTimeField(source="created_at", format="%d %b %Y", read_only=True)

    class Meta:
        model = Transaction
        fields = ["id", "label", "date", "amount", "kind"]
