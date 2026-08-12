import random
from datetime import date, datetime

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.invoices.models import Invoice, InvoiceAdvance, Transaction
from apps.notifications.models import Notification
from apps.scoring.models import RiskScoreBreakdown

User = get_user_model()

DEMO_PDF = b"%PDF-1.4\n%demo\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"


def _momo_transaction_id():
    hexpart = lambda n: "".join(random.choices("0123456789ABCDEF", k=n))  # noqa: E731
    return f"ZMK-{hexpart(4)}-{hexpart(4)}-RW"


def _aware(naive_date):
    return timezone.make_aware(datetime.combine(naive_date, datetime.min.time()).replace(hour=10))


def _backdate(instance, dt):
    """created_at is auto_now_add, so it's stamped at insert time regardless of
    what we pass to .create() — override it after the fact so seeded rows form
    a chronologically consistent story instead of all reading as 'right now'."""
    type(instance).objects.filter(pk=instance.pk).update(created_at=dt)


class Command(BaseCommand):
    help = "Wipes existing data and seeds a realistic demo dataset for the ZamukaPay live demo."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Wiping existing data...")
        User.objects.all().delete()

        self.stdout.write("Creating users...")
        aline = User.objects.create_user(
            email="aline@umucyo.rw",
            password="demo1234",
            role=User.Role.SUPPLIER,
            company_name="Umucyo Fresh Produce Ltd",
            phone_number="+250788000001",
            is_verified=True,
        )
        jean = User.objects.create_user(
            email="jean@inzovu.rw",
            password="demo1234",
            role=User.Role.SUPPLIER,
            company_name="Inzovu Agri Supplies",
            phone_number="+250788000002",
            is_verified=True,
        )
        simba = User.objects.create_user(
            email="simba@supermarket.rw",
            password="demo1234",
            role=User.Role.BUYER,
            company_name="Simba Supermarket Ltd",
            phone_number="+250788100001",
            is_verified=True,
        )
        inyange = User.objects.create_user(
            email="procurement@inyange.rw",
            password="demo1234",
            role=User.Role.BUYER,
            company_name="Inyange Industries Ltd",
            phone_number="+250788100002",
            is_verified=True,
        )
        User.objects.create_superuser(
            email="admin@zamukapay.rw",
            password="admin1234",
            company_name="ZamukaPay Admin",
            is_verified=True,
        )

        self.stdout.write("Creating invoices...")

        def make_invoice(number, supplier, buyer, amount, due_date, status, created_at):
            invoice = Invoice(
                number=number,
                supplier=supplier,
                buyer=buyer,
                amount=amount,
                due_date=due_date,
                status=status,
                goods_description="Fresh produce delivery",
                purchase_order_number=f"PO-{number[-4:]}",
            )
            invoice.pdf_file.save(f"{number}.pdf", ContentFile(DEMO_PDF), save=False)
            invoice.save()
            Invoice.objects.filter(pk=invoice.pk).update(created_at=_aware(created_at))
            invoice.refresh_from_db()
            return invoice

        def make_advance_and_score(
            invoice, score, recommendation, advance_amount, fee_percentage, fee_amount, net_amount,
            advance_status, phone_number, disbursed_at,
        ):
            breakdown = RiskScoreBreakdown.objects.create(
                invoice=invoice,
                buyer_payment_history_score=round(score * 0.35),
                buyer_payment_history_label="Excellent" if score >= 75 else "Good",
                relationship_age_months=6,
                relationship_age_score=10,
                invoice_vs_average_score=round(score * 0.2),
                invoice_vs_average_label="Normal range",
                buyer_verification_score=25,
                buyer_verification_label="Verified",
                overall_score=score,
                recommendation=recommendation,
                advance_amount=advance_amount,
                fee_percentage=fee_percentage,
                fee_amount=fee_amount,
                net_amount=net_amount,
            )
            _backdate(breakdown, disbursed_at)

            advance = InvoiceAdvance.objects.create(
                invoice=invoice,
                advance_amount=advance_amount,
                fee_percentage=fee_percentage,
                fee_amount=fee_amount,
                net_amount=net_amount,
                momo_phone_number=phone_number,
                momo_transaction_id=_momo_transaction_id(),
                status=advance_status,
                disbursed_at=disbursed_at,
            )
            _backdate(advance, disbursed_at)
            return advance

        def make_disbursement_transactions(invoice, supplier, net_amount, fee_amount, disbursed_at):
            advance_txn = Transaction.objects.create(
                user=supplier,
                invoice=invoice,
                label=f"Advance received — {invoice.number}",
                amount=net_amount,
                kind=Transaction.Kind.IN,
                transaction_type=Transaction.TransactionType.ADVANCE,
            )
            _backdate(advance_txn, disbursed_at)

            fee_txn = Transaction.objects.create(
                user=supplier,
                invoice=invoice,
                label=f"Platform fee — {invoice.number}",
                amount=-fee_amount,
                kind=Transaction.Kind.OUT,
                transaction_type=Transaction.TransactionType.FEE,
            )
            _backdate(fee_txn, disbursed_at)

        def make_repayment_transaction(invoice, buyer, repaid_at):
            repayment = Transaction.objects.create(
                user=buyer,
                invoice=invoice,
                label=f"Repayment received — {invoice.number}",
                amount=invoice.amount,
                kind=Transaction.Kind.OUT,
                transaction_type=Transaction.TransactionType.REPAYMENT_RECEIVED,
            )
            _backdate(repayment, repaid_at)

        # INV-2029 — jean -> inyange, SETTLED (repaid on the due date, both in the past)
        inv_2029 = make_invoice(
            "INV-2029", jean, inyange, 750_000, date(2026, 8, 1),
            Invoice.Status.SETTLED, date(2026, 7, 20),
        )
        disbursed_2029 = _aware(date(2026, 7, 21))
        make_advance_and_score(
            inv_2029, 71, RiskScoreBreakdown.Recommendation.APPROVE,
            600_000, 4, 24_000, 576_000,
            InvoiceAdvance.Status.REPAID, jean.phone_number, disbursed_2029,
        )
        make_disbursement_transactions(inv_2029, jean, 576_000, 24_000, disbursed_2029)
        make_repayment_transaction(inv_2029, inyange, _aware(date(2026, 8, 1)))

        # INV-2038 — aline -> simba, SETTLED (repaid on the due date, both in the past)
        inv_2038 = make_invoice(
            "INV-2038", aline, simba, 1_250_000, date(2026, 8, 10),
            Invoice.Status.SETTLED, date(2026, 7, 25),
        )
        disbursed_2038 = _aware(date(2026, 7, 26))
        make_advance_and_score(
            inv_2038, 79, RiskScoreBreakdown.Recommendation.APPROVE,
            1_000_000, 4, 40_000, 960_000,
            InvoiceAdvance.Status.REPAID, aline.phone_number, disbursed_2038,
        )
        make_disbursement_transactions(inv_2038, aline, 960_000, 40_000, disbursed_2038)
        make_repayment_transaction(inv_2038, simba, _aware(date(2026, 8, 10)))

        # INV-2033 — aline -> simba, ADVANCE_PAID (disbursed, due date still ahead — not yet settled)
        inv_2033 = make_invoice(
            "INV-2033", aline, simba, 860_000, date(2026, 9, 5),
            Invoice.Status.ADVANCE_PAID, date(2026, 8, 5),
        )
        disbursed_2033 = _aware(date(2026, 8, 6))
        make_advance_and_score(
            inv_2033, 82, RiskScoreBreakdown.Recommendation.APPROVE,
            688_000, 4, 27_520, 660_480,
            InvoiceAdvance.Status.DISBURSED, aline.phone_number, disbursed_2033,
        )
        make_disbursement_transactions(inv_2033, aline, 660_480, 27_520, disbursed_2033)

        # INV-2041 — aline -> inyange, CONFIRMED (the one clicked LIVE in the demo)
        make_invoice(
            "INV-2041", aline, inyange, 2_000_000, date(2026, 9, 12),
            Invoice.Status.CONFIRMED, date(2026, 8, 10),
        )

        # INV-2045 — jean -> simba, PENDING_CONFIRMATION
        make_invoice(
            "INV-2045", jean, simba, 500_000, date(2026, 9, 20),
            Invoice.Status.PENDING_CONFIRMATION, date(2026, 8, 11),
        )

        self.stdout.write("Creating notifications...")
        Notification.objects.create(
            user=aline, type=Notification.Type.MOMO_PAYOUT,
            message="960,000 RWF sent to +250788000001 for INV-2038.", is_read=True,
        )
        Notification.objects.create(
            user=aline, type=Notification.Type.MOMO_PAYOUT,
            message="660,480 RWF sent to +250788000001 for INV-2033.", is_read=False,
        )
        Notification.objects.create(
            user=aline, type=Notification.Type.INVOICE_CONFIRMED,
            message="Inyange Industries Ltd confirmed INV-2041.", is_read=False,
        )
        Notification.objects.create(
            user=jean, type=Notification.Type.MOMO_PAYOUT,
            message="576,000 RWF sent to +250788000002 for INV-2029.", is_read=True,
        )

        self.stdout.write(self.style.SUCCESS(
            "Seeded: 2 suppliers, 2 buyers, 1 admin, 5 invoices "
            "(1 confirmed/unscored, 1 pending, 1 advance_paid, 2 settled), 4 notifications."
        ))
        self.stdout.write("  aline@umucyo.rw / demo1234 (SUPPLIER)")
        self.stdout.write("  jean@inzovu.rw / demo1234 (SUPPLIER)")
        self.stdout.write("  simba@supermarket.rw / demo1234 (BUYER)")
        self.stdout.write("  procurement@inyange.rw / demo1234 (BUYER)")
        self.stdout.write("  admin@zamukapay.rw / admin1234 (ADMIN)")
