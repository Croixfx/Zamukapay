import random

from django.core.mail import send_mail
from django.utils import timezone

from apps.invoices.models import Invoice, InvoiceAdvance, Transaction

from .models import Notification


def _random_hex(length):
    return "".join(random.choices("0123456789ABCDEF", k=length))


def _generate_momo_transaction_id():
    return f"ZMK-{_random_hex(4)}-{_random_hex(4)}-RW"


class EmailService:
    @staticmethod
    def send_notification_email(user, subject, message):
        send_mail(subject, message, None, [user.email], fail_silently=True)


class MoMoPayoutService:
    """Simulates an MTN MoMo disbursement — no real payment rail is involved."""

    @staticmethod
    def send_payout(invoice: Invoice) -> InvoiceAdvance:
        breakdown = getattr(invoice, "risk_score", None)
        if breakdown is None:
            raise ValueError("Invoice must be scored before it can be disbursed.")
        if breakdown.recommendation == breakdown.Recommendation.DECLINE:
            raise ValueError("Declined invoices cannot be disbursed.")

        advance, _ = InvoiceAdvance.objects.update_or_create(
            invoice=invoice,
            defaults={
                "advance_amount": breakdown.advance_amount,
                "fee_percentage": breakdown.fee_percentage,
                "fee_amount": breakdown.fee_amount,
                "net_amount": breakdown.net_amount,
                "momo_phone_number": invoice.supplier.phone_number,
                "momo_transaction_id": _generate_momo_transaction_id(),
                "status": InvoiceAdvance.Status.DISBURSED,
                "disbursed_at": timezone.now(),
            },
        )

        invoice.status = Invoice.Status.ADVANCED
        invoice.save(update_fields=["status", "updated_at"])

        Transaction.objects.create(
            user=invoice.supplier,
            invoice=invoice,
            label=f"Advance received — {invoice.number}",
            amount=advance.net_amount,
            kind=Transaction.Kind.IN,
            transaction_type=Transaction.TransactionType.ADVANCE,
        )
        Transaction.objects.create(
            user=invoice.supplier,
            invoice=invoice,
            label=f"Platform fee — {invoice.number}",
            amount=-advance.fee_amount,
            kind=Transaction.Kind.OUT,
            transaction_type=Transaction.TransactionType.FEE,
        )

        message = f"{advance.net_amount:,.0f} RWF sent to {advance.momo_phone_number} for {invoice.number}."
        Notification.objects.create(user=invoice.supplier, type=Notification.Type.MOMO_PAYOUT, message=message)
        EmailService.send_notification_email(invoice.supplier, "MoMo payout sent — ZamukaPay", message)

        return advance
