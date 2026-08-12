from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

User = get_user_model()


class Command(BaseCommand):
    help = (
        "Wipes existing data and seeds only the demo accounts (no invoices) — "
        "the full invoice lifecycle is created live through the real app flow."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Wiping existing data...")
        User.objects.all().delete()

        self.stdout.write("Creating users...")
        User.objects.create_user(
            email="aline@umucyo.rw",
            password="demo1234",
            role=User.Role.SUPPLIER,
            company_name="Umucyo Fresh Produce Ltd",
            phone_number="+250788000001",
            is_verified=True,
        )
        User.objects.create_user(
            email="jean@inzovu.rw",
            password="demo1234",
            role=User.Role.SUPPLIER,
            company_name="Inzovu Agri Supplies",
            phone_number="+250788000002",
            is_verified=True,
        )
        User.objects.create_user(
            email="simba@supermarket.rw",
            password="demo1234",
            role=User.Role.BUYER,
            company_name="Simba Supermarket Ltd",
            phone_number="+250788100001",
            is_verified=True,
        )
        User.objects.create_user(
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

        self.stdout.write(self.style.SUCCESS(
            "Seeded: 2 suppliers, 2 buyers, 1 admin. No invoices — "
            "submit, confirm, score, pay out and settle them live through the app."
        ))
        self.stdout.write("  aline@umucyo.rw / demo1234 (SUPPLIER)")
        self.stdout.write("  jean@inzovu.rw / demo1234 (SUPPLIER)")
        self.stdout.write("  simba@supermarket.rw / demo1234 (BUYER)")
        self.stdout.write("  procurement@inyange.rw / demo1234 (BUYER)")
        self.stdout.write("  admin@zamukapay.rw / admin1234 (ADMIN)")
