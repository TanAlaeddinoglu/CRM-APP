import random
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.text import slugify

from common.utils import APPOINTMENT_STATUS, APPOINTMENT_TYPES, COLOUR_CHOICES, PAYMENT_STATUS
from customer.models import Customer, CustomerTagHistory, Tag
from events.models import Appointment, AppointmentPayment
from products.models import Product


class Command(BaseCommand):
    help = "Seed large test data for reports performance testing."

    def add_arguments(self, parser):
        parser.add_argument("--customers", type=int, default=1000)
        parser.add_argument("--appointments", type=int, default=1500)
        parser.add_argument("--payments", type=int, default=700)
        parser.add_argument("--tag-history", type=int, dest="tag_history", default=2000)
        parser.add_argument("--prefix", type=str, default="perfseed")
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing seed data for the given prefix before creating new data.",
        )
        parser.add_argument("--batch-size", type=int, default=1000)

    def handle(self, *args, **options):
        customers_count = options["customers"]
        appointments_count = options["appointments"]
        payments_count = options["payments"]
        tag_history_count = options["tag_history"]
        prefix = options["prefix"].strip().lower()
        batch_size = options["batch_size"]

        if not prefix:
            self.stdout.write(self.style.ERROR("Prefix boş olamaz."))
            return

        User = get_user_model()
        now = timezone.now()

        appointment_type_value = self._resolve_choice(APPOINTMENT_TYPES, preferred="tedavi")
        status_pending = self._resolve_choice(APPOINTMENT_STATUS, preferred="beklemede")
        status_sales = self._resolve_choice(APPOINTMENT_STATUS, preferred="satis")
        status_negative = self._resolve_choice(APPOINTMENT_STATUS, preferred="olumsuz")

        payment_completed = self._resolve_choice(PAYMENT_STATUS, preferred="tamamlandi")
        payment_cancelled = self._resolve_choice(PAYMENT_STATUS, preferred="iptal")
        payment_partial = self._resolve_payment_partial(PAYMENT_STATUS, payment_completed, payment_cancelled)

        if options["reset"]:
            self._reset_seed_data(prefix=prefix)

        with transaction.atomic():
            seed_users = self._ensure_seed_users(User=User, prefix=prefix)
            created_by = seed_users[0]

            tags = self._ensure_tags(prefix=prefix)
            products = self._ensure_products(prefix=prefix, created_by=created_by)

            customers = self._create_customers(
                prefix=prefix,
                count=customers_count,
                users=seed_users,
                tags=tags,
                created_by=created_by,
                now=now,
                batch_size=batch_size,
            )

            tag_history_rows = self._create_tag_history(
                count=tag_history_count,
                customers=customers,
                tags=tags,
                changed_by=created_by,
                now=now,
                batch_size=batch_size,
            )

            appointments = self._create_appointments(
                prefix=prefix,
                count=appointments_count,
                customers=customers,
                products=products,
                created_by=created_by,
                now=now,
                appointment_type_value=appointment_type_value,
                status_pending=status_pending,
                status_sales=status_sales,
                status_negative=status_negative,
                batch_size=batch_size,
            )

            payment_rows = self._create_payments(
                count=payments_count,
                appointments=appointments,
                created_by=created_by,
                now=now,
                payment_completed=payment_completed,
                payment_partial=payment_partial,
                payment_cancelled=payment_cancelled,
                sales_status=status_sales,
                batch_size=batch_size,
            )

        self.stdout.write(self.style.SUCCESS("Seed işlemi tamamlandı."))
        self.stdout.write(
            f"Users: {len(seed_users)} | Tags: {len(tags)} | Products: {len(products)}"
        )
        self.stdout.write(
            f"Customers: {len(customers)} | TagHistory: {tag_history_rows} | "
            f"Appointments: {len(appointments)} | Payments: {payment_rows}"
        )

    def _resolve_choice(self, choices, preferred=None):
        values = [value for value, _ in choices]
        if preferred and preferred in values:
            return preferred
        return values[0]

    def _resolve_payment_partial(self, choices, completed_value, cancelled_value):
        values = [value for value, _ in choices]
        for value in values:
            if value not in {completed_value, cancelled_value}:
                return value
        return completed_value

    def _ensure_seed_users(self, User, prefix):
        users = []
        usernames = [
            f"{prefix}_admin",
            f"{prefix}_user_1",
            f"{prefix}_user_2",
            f"{prefix}_user_3",
        ]

        roles = [
            getattr(User.Role, "ADMIN", "ADMIN"),
            getattr(User.Role, "USER", "USER"),
            getattr(User.Role, "USER", "USER"),
            getattr(User.Role, "USER", "USER"),
        ]

        for username, role in zip(usernames, roles):
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"{username}@example.com",
                    "first_name": username.split("_")[-1].capitalize(),
                    "last_name": "Seed",
                    "role": role,
                    "is_active": True,
                },
            )
            if created:
                user.set_password("testpass123")
                user.save(update_fields=["password", "is_staff"])
            users.append(user)

        return users

    def _ensure_tags(self, prefix):
        colors = [value for value, _ in COLOUR_CHOICES]
        tag_names = [
            "Yeni Data",
            "Sıcak Takip",
            "Ulaşılamadı",
            "Randevu Operasyon",
            "Olumsuz",
            "Soğuk Takip",
        ]

        tags = []
        for index, tag_name in enumerate(tag_names):
            slug = slugify(f"{prefix}-{tag_name}") or f"{prefix}-tag-{index+1}"
            tag, _ = Tag.objects.get_or_create(
                slug=slug,
                defaults={
                    "tag_name": f"{prefix.upper()} {tag_name}",
                    "color": colors[index % len(colors)],
                    "description": f"{prefix} seed tag {index + 1}",
                },
            )
            tags.append(tag)

        return tags

    def _ensure_products(self, prefix, created_by):
        product_names = [
            "Sertleşme",
            "Kalınlaştırma",
            "Büyütme",
            "Eğrilik",
            "Kontrol",
        ]

        products = []
        for index, name in enumerate(product_names):
            slug = slugify(f"{prefix}-{name}") or f"{prefix}-product-{index+1}"
            product, _ = Product.objects.get_or_create(
                slug=slug,
                defaults={
                    "name": f"{prefix.upper()} {name}",
                    "description": f"{prefix} seed product {index + 1}",
                    "created_by": created_by,
                },
            )
            products.append(product)

        return products

    def _create_customers(self, prefix, count, users, tags, created_by, now, batch_size):
        customers = []
        customer_rows = []

        statuses = ["active", "active", "active", "active", "pool", "archived"]
        sources = ["excel", "meta", "google", "instagram", "whatsapp"]

        for i in range(count):
            created_at = now - timedelta(days=random.randint(0, 120), hours=random.randint(0, 23))
            status = random.choice(statuses)
            email = f"{prefix}_customer_{i}@example.com"

            customer_rows.append(
                Customer(
                    customer_name=f"Seed{i}",
                    customer_surname=f"User{i}",
                    customer_email=email,
                    email_normalized=email.lower(),
                    customer_phone=self._phone_for_index(i),
                    city=random.choice(["Istanbul", "Ankara", "Izmir", "Bursa", "Antalya"]),
                    assigned_to=random.choice(users),
                    tag=random.choice(tags) if status == "active" else None,
                    created_at=created_at,
                    updated_at=created_at,
                    created_by=created_by,
                    updated_by=created_by,
                    status=status,
                    source=random.choice(sources),
                    archived_at=created_at if status == "archived" else None,
                    is_active=(status == "active"),
                )
            )

        created = Customer.objects.bulk_create(customer_rows, batch_size=batch_size)
        customers.extend(created)
        return customers

    def _create_tag_history(self, count, customers, tags, changed_by, now, batch_size):
        if not customers or not tags or count <= 0:
            return 0

        history_rows = []
        customers_for_update = {}
        tag_history_total = 0

        for i in range(count):
            customer = random.choice(customers)
            previous_tag = customer.tag
            new_tag = random.choice(tags)
            changed_at = now - timedelta(days=random.randint(0, 120), hours=random.randint(0, 23))

            history_rows.append(
                CustomerTagHistory(
                    customer=customer,
                    from_tag=previous_tag,
                    to_tag=new_tag,
                    changed_by=changed_by,
                    changed_at=changed_at,
                    notes=f"seed transition {i}",
                )
            )

            customer.tag = new_tag
            customer.updated_by = changed_by
            customer.updated_at = changed_at
            customers_for_update[customer.pk] = customer
            tag_history_total += 1

        CustomerTagHistory.objects.bulk_create(history_rows, batch_size=batch_size)
        Customer.objects.bulk_update(
            list(customers_for_update.values()),
            ["tag", "updated_by", "updated_at"],
            batch_size=batch_size,
        )
        return tag_history_total

    def _create_appointments(
        self,
        prefix,
        count,
        customers,
        products,
        created_by,
        now,
        appointment_type_value,
        status_pending,
        status_sales,
        status_negative,
        batch_size,
    ):
        if not customers or not products or count <= 0:
            return []

        appointments = []
        appointment_rows = []

        status_pool = (
            [status_sales] * 45
            + [status_pending] * 35
            + [status_negative] * 20
        )

        for i in range(count):
            customer = random.choice(customers)
            created_at = now - timedelta(days=random.randint(0, 120), hours=random.randint(0, 23))
            scheduled_for = created_at + timedelta(days=random.randint(1, 20), hours=random.randint(0, 8))

            appointment_rows.append(
                Appointment(
                    name=f"{prefix.upper()} Appointment {i + 1}",
                    scheduled_for=scheduled_for,
                    appointment_type=appointment_type_value,
                    customer=customer,
                    product=random.choice(products),
                    notes=f"{prefix} seed appointment {i + 1}",
                    status=random.choice(status_pool),
                    created_at=created_at,
                    updated_at=created_at,
                    created_by=created_by,
                    updated_by=created_by,
                )
            )

        created = Appointment.objects.bulk_create(appointment_rows, batch_size=batch_size)
        appointments.extend(created)
        return appointments

    def _create_payments(
        self,
        count,
        appointments,
        created_by,
        now,
        payment_completed,
        payment_partial,
        payment_cancelled,
        sales_status,
        batch_size,
    ):
        if not appointments or count <= 0:
            return 0

        sales_appointments = [a for a in appointments if a.status == sales_status]
        if not sales_appointments:
            return 0

        rows = []
        totals_by_appointment = {}
        paid_by_appointment = {}

        for i in range(count):
            appointment = random.choice(sales_appointments)

            total_amount = totals_by_appointment.get(appointment.pk)
            if total_amount is None:
                total_amount = Decimal(random.choice([8000, 12000, 15000, 20000, 25000, 30000]))
                totals_by_appointment[appointment.pk] = total_amount
                paid_by_appointment[appointment.pk] = Decimal("0.00")

            paid_so_far = paid_by_appointment[appointment.pk]
            remaining_before = total_amount - paid_so_far
            if remaining_before <= Decimal("0.00"):
                continue

            status_choice = random.choices(
                population=[payment_partial, payment_completed, payment_cancelled],
                weights=[60, 30, 10],
                k=1,
            )[0]

            if status_choice == payment_completed:
                paid_amount = remaining_before
            elif status_choice == payment_cancelled:
                paid_amount = Decimal("0.00")
            else:
                if remaining_before <= Decimal("1000.00"):
                    paid_amount = remaining_before
                    status_choice = payment_completed
                else:
                    paid_amount = Decimal(random.randint(500, int(float(remaining_before))))
                    if paid_amount >= remaining_before:
                        paid_amount = remaining_before
                        status_choice = payment_completed

            new_total_paid = paid_so_far + paid_amount
            remaining_amount = total_amount - new_total_paid
            payment_date = now - timedelta(days=random.randint(0, 120), hours=random.randint(0, 23))

            if remaining_amount == Decimal("0.00"):
                status_choice = payment_completed

            rows.append(
                AppointmentPayment(
                    appointment=appointment,
                    total_amount=total_amount,
                    payment_date=payment_date,
                    paid_amount=paid_amount,
                    remaining_amount=remaining_amount,
                    payment_status=status_choice,
                    created_at=payment_date,
                    updated_at=payment_date,
                    created_by=created_by,
                    updated_by=created_by,
                )
            )

            paid_by_appointment[appointment.pk] = new_total_paid

        if not rows:
            return 0

        AppointmentPayment.objects.bulk_create(rows, batch_size=batch_size)
        return len(rows)

    def _reset_seed_data(self, prefix):
        user_model = get_user_model()

        prefix_upper = prefix.upper()

        AppointmentPayment.objects.filter(
            appointment__name__startswith=f"{prefix_upper} Appointment"
        ).delete()

        Appointment.objects.filter(name__startswith=f"{prefix_upper} Appointment").delete()

        CustomerTagHistory.objects.filter(
            Q(notes__startswith="seed transition") | Q(customer__customer_email__startswith=f"{prefix}_customer_")
        ).delete()

        Customer.objects.filter(customer_email__startswith=f"{prefix}_customer_").delete()

        Product.objects.filter(name__startswith=f"{prefix_upper} ").delete()
        Tag.objects.filter(tag_name__startswith=f"{prefix_upper} ").delete()
        user_model.objects.filter(username__startswith=f"{prefix}_").delete()

    def _phone_for_index(self, i):
        return f"5{(100000000 + i) % 1000000000:09d}"