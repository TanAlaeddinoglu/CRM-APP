from collections import defaultdict
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.db.models import Count, OuterRef, Q, Subquery, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from customer.models import Customer, CustomerTagHistory
from events.models import Appointment, AppointmentPayment
from reports.constants import (
    APPOINTMENT_STATUS_NEGATIVE,
    APPOINTMENT_STATUS_PENDING,
    APPOINTMENT_STATUS_SALES,
    DEFAULT_REPORT_PRESET,
    PAYMENT_STATUS_CANCELLED,
    PAYMENT_STATUS_COMPLETED,
)


def _make_aware_start(dt_date):
    tz = timezone.get_current_timezone()
    return timezone.make_aware(datetime.combine(dt_date, time.min), tz)


def _money(value):
    value = value or Decimal("0.00")
    return float(round(value, 2))


def _serialize_user(user):
    if user is None:
        return None

    return {
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
    }


def _serialize_user_filter(user):
    if user is None:
        return None

    return {
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
    }


def _serialize_product(product):
    if product is None:
        return None

    return {
        "id": product.id,
        "name": product.name,
        "slug": product.slug,
    }


def resolve_date_range(validated_data):
    date_from = validated_data.get("date_from")
    date_to = validated_data.get("date_to")
    preset = validated_data.get("preset", DEFAULT_REPORT_PRESET)

    if date_from and date_to:
        start_dt = _make_aware_start(date_from)
        end_dt = _make_aware_start(date_to + timedelta(days=1))
        return start_dt, end_dt

    days = int(preset)
    end_dt = timezone.now()
    start_dt = end_dt - timedelta(days=days)
    return start_dt, end_dt


def build_user_dashboard_summary(*, target_user, start_dt, end_dt):
    active_customer_count = Customer.objects.filter(
        assigned_to=target_user,
        status="active",
        created_at__gte=start_dt,
        created_at__lt=end_dt,
    ).count()

    tag_change_count = CustomerTagHistory.objects.filter(
        customer__assigned_to=target_user,
        changed_at__gte=start_dt,
        changed_at__lt=end_dt,
    ).count()

    tag_distribution_qs = (
        CustomerTagHistory.objects.filter(
            customer__assigned_to=target_user,
            changed_at__gte=start_dt,
            changed_at__lt=end_dt,
            to_tag__isnull=False,
        )
        .values("to_tag_id", "to_tag__tag_name", "to_tag__slug", "to_tag__color")
        .annotate(count=Count("id"))
        .order_by("-count", "to_tag__tag_name")
    )

    tag_distribution = [
        {
            "tag_id": row["to_tag_id"],
            "tag_name": row["to_tag__tag_name"],
            "tag_slug": row["to_tag__slug"],
            "tag_color": row["to_tag__color"],
            "count": row["count"],
        }
        for row in tag_distribution_qs
    ]

    appointments = Appointment.objects.filter(
        customer__assigned_to=target_user,
        created_at__gte=start_dt,
        created_at__lt=end_dt,
    )

    appointment_counts = appointments.aggregate(
        total_appointments=Count("id"),
        pending_appointments=Count(
            "id", filter=Q(status=APPOINTMENT_STATUS_PENDING)
        ),
        sales_appointments=Count(
            "id", filter=Q(status=APPOINTMENT_STATUS_SALES)
        ),
        negative_appointments=Count(
            "id", filter=Q(status=APPOINTMENT_STATUS_NEGATIVE)
        ),
    )

    total_appointments = appointment_counts["total_appointments"] or 0
    pending_appointments = appointment_counts["pending_appointments"] or 0
    sales_appointments = appointment_counts["sales_appointments"] or 0
    negative_appointments = appointment_counts["negative_appointments"] or 0

    conversion_rate = (
        round((sales_appointments / total_appointments) * 100, 2)
        if total_appointments
        else 0.0
    )

    rejection_rate = (
        round((negative_appointments / total_appointments) * 100, 2)
        if total_appointments
        else 0.0
    )

    sales_by_product_qs = (
        appointments.filter(
            status=APPOINTMENT_STATUS_SALES,
            product__isnull=False,
        )
        .values("product_id", "product__name", "product__slug")
        .annotate(count=Count("id"))
        .order_by("-count", "product__name")
    )

    sales_by_product = [
        {
            "product_id": row["product_id"],
            "product_name": row["product__name"],
            "product_slug": row["product__slug"],
            "count": row["count"],
        }
        for row in sales_by_product_qs
    ]

    trend_qs = (
        appointments.annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(total=Count("id"))
        .order_by("day")
    )

    appointments_trend = [
        {
            "day": row["day"].isoformat() if row["day"] else None,
            "total": row["total"],
        }
        for row in trend_qs
    ]

    top_product = sales_by_product[0] if sales_by_product else None

    return {
        "date_range": {
            "start": start_dt.isoformat(),
            "end": end_dt.isoformat(),
        },
        "target_user": _serialize_user(target_user),
        "summary": {
            "active_customer_count": active_customer_count,
            "tag_change_count": tag_change_count,
            "total_appointments": total_appointments,
            "pending_appointments": pending_appointments,
            "sales_appointments": sales_appointments,
            "negative_appointments": negative_appointments,
            "conversion_rate": conversion_rate,
            "rejection_rate": rejection_rate,
            "top_product": top_product,
        },
        "charts": {
            "tag_distribution": tag_distribution,
            "sales_by_product": sales_by_product,
            "appointments_trend": appointments_trend,
        },
    }


def build_appointments_summary(*, start_dt, end_dt, target_user=None, target_product=None):
    appointments = Appointment.objects.filter(
        created_at__gte=start_dt,
        created_at__lt=end_dt,
    )

    if target_user is not None:
        appointments = appointments.filter(customer__assigned_to=target_user)

    if target_product is not None:
        appointments = appointments.filter(product=target_product)

    summary_counts = appointments.aggregate(
        total_appointments=Count("id"),
        pending_appointments=Count(
            "id", filter=Q(status=APPOINTMENT_STATUS_PENDING)
        ),
        sales_appointments=Count(
            "id", filter=Q(status=APPOINTMENT_STATUS_SALES)
        ),
        negative_appointments=Count(
            "id", filter=Q(status=APPOINTMENT_STATUS_NEGATIVE)
        ),
    )

    total_appointments = summary_counts["total_appointments"] or 0
    pending_appointments = summary_counts["pending_appointments"] or 0
    sales_appointments = summary_counts["sales_appointments"] or 0
    negative_appointments = summary_counts["negative_appointments"] or 0

    sales_rate = (
        round((sales_appointments / total_appointments) * 100, 2)
        if total_appointments
        else 0.0
    )
    pending_rate = (
        round((pending_appointments / total_appointments) * 100, 2)
        if total_appointments
        else 0.0
    )
    negative_rate = (
        round((negative_appointments / total_appointments) * 100, 2)
        if total_appointments
        else 0.0
    )

    product_breakdown_qs = (
        appointments.values("product_id", "product__name", "product__slug")
        .annotate(
            total=Count("id"),
            pending=Count("id", filter=Q(status=APPOINTMENT_STATUS_PENDING)),
            sales=Count("id", filter=Q(status=APPOINTMENT_STATUS_SALES)),
            negative=Count("id", filter=Q(status=APPOINTMENT_STATUS_NEGATIVE)),
        )
        .order_by("-total", "product__name")
    )

    product_breakdown = []
    for row in product_breakdown_qs:
        total = row["total"] or 0
        sales = row["sales"] or 0
        pending = row["pending"] or 0
        negative = row["negative"] or 0

        product_breakdown.append(
            {
                "product_id": row["product_id"],
                "product_name": row["product__name"],
                "product_slug": row["product__slug"],
                "total": total,
                "pending": pending,
                "sales": sales,
                "negative": negative,
                "sales_rate": round((sales / total) * 100, 2) if total else 0.0,
                "pending_rate": round((pending / total) * 100, 2) if total else 0.0,
                "negative_rate": round((negative / total) * 100, 2) if total else 0.0,
            }
        )

    user_performance_qs = (
        appointments.values(
            "customer__assigned_to_id",
            "customer__assigned_to__username",
            "customer__assigned_to__first_name",
            "customer__assigned_to__last_name",
        )
        .annotate(
            total=Count("id"),
            pending=Count("id", filter=Q(status=APPOINTMENT_STATUS_PENDING)),
            sales=Count("id", filter=Q(status=APPOINTMENT_STATUS_SALES)),
            negative=Count("id", filter=Q(status=APPOINTMENT_STATUS_NEGATIVE)),
        )
        .order_by("-total", "customer__assigned_to__username")
    )

    user_performance = []
    for row in user_performance_qs:
        total = row["total"] or 0
        sales = row["sales"] or 0

        user_performance.append(
            {
                "user_id": row["customer__assigned_to_id"],
                "username": row["customer__assigned_to__username"],
                "first_name": row["customer__assigned_to__first_name"],
                "last_name": row["customer__assigned_to__last_name"],
                "total": total,
                "pending": row["pending"] or 0,
                "sales": sales,
                "negative": row["negative"] or 0,
                "sales_rate": round((sales / total) * 100, 2) if total else 0.0,
            }
        )

    trend_qs = (
        appointments.annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(
            total=Count("id"),
            sales=Count("id", filter=Q(status=APPOINTMENT_STATUS_SALES)),
        )
        .order_by("day")
    )

    trend = [
        {
            "day": row["day"].isoformat() if row["day"] else None,
            "total": row["total"],
            "sales": row["sales"],
        }
        for row in trend_qs
    ]

    return {
        "date_range": {
            "start": start_dt.isoformat(),
            "end": end_dt.isoformat(),
        },
        "filters": {
            "user": _serialize_user_filter(target_user),
            "product": _serialize_product(target_product),
        },
        "summary": {
            "total_appointments": total_appointments,
            "pending_appointments": pending_appointments,
            "sales_appointments": sales_appointments,
            "negative_appointments": negative_appointments,
            "sales_rate": sales_rate,
            "pending_rate": pending_rate,
            "negative_rate": negative_rate,
        },
        "tables": {
            "product_breakdown": product_breakdown,
            "user_performance": user_performance,
        },
        "charts": {
            "trend": trend,
        },
    }


def build_payment_summary(*, start_dt, end_dt, target_user=None, target_product=None):
    payments = AppointmentPayment.objects.filter(
        appointment__status=APPOINTMENT_STATUS_SALES,
        payment_date__gte=start_dt,
        payment_date__lt=end_dt,
    )

    if target_user is not None:
        payments = payments.filter(appointment__customer__assigned_to=target_user)

    if target_product is not None:
        payments = payments.filter(appointment__product=target_product)

    payments = payments.select_related(
        "appointment__product",
        "appointment__customer__assigned_to",
    ).order_by("appointment_id", "-payment_date", "-created_at", "-id")

    payment_totals = payments.aggregate(
        total_paid_amount=Sum("paid_amount"),
        total_payment_rows=Count("id"),
    )

    total_paid_amount = payment_totals["total_paid_amount"] or Decimal("0.00")
    total_payment_rows = payment_totals["total_payment_rows"] or 0

    latest_payment_by_appointment = {}
    paid_amount_by_appointment = defaultdict(lambda: Decimal("0.00"))

    for payment in payments:
        appointment_id = payment.appointment_id
        paid_amount_by_appointment[appointment_id] += (
            payment.paid_amount or Decimal("0.00")
        )

        if appointment_id not in latest_payment_by_appointment:
            latest_payment_by_appointment[appointment_id] = payment

    total_sales_appointments = len(latest_payment_by_appointment)

    completed_appointments = 0
    partial_appointments = 0
    cancelled_appointments = 0

    completed_paid_amount = Decimal("0.00")
    partial_paid_amount = Decimal("0.00")
    cancelled_paid_amount = Decimal("0.00")
    total_remaining_amount = Decimal("0.00")

    product_breakdown_map = {}

    for appointment_id, latest_payment in latest_payment_by_appointment.items():
        appointment_paid_amount = paid_amount_by_appointment[appointment_id]
        latest_remaining_amount = latest_payment.remaining_amount or Decimal("0.00")
        total_remaining_amount += latest_remaining_amount

        product = latest_payment.appointment.product
        product_id = product.id

        if product_id not in product_breakdown_map:
            product_breakdown_map[product_id] = {
                "product_id": product.id,
                "product_name": product.name,
                "product_slug": product.slug,
                "total_sales_appointments": 0,
                "completed_appointments": 0,
                "partial_appointments": 0,
                "cancelled_appointments": 0,
                "total_paid_amount": Decimal("0.00"),
                "completed_paid_amount": Decimal("0.00"),
                "partial_paid_amount": Decimal("0.00"),
                "cancelled_paid_amount": Decimal("0.00"),
                "total_remaining_amount": Decimal("0.00"),
            }

        row = product_breakdown_map[product_id]
        row["total_sales_appointments"] += 1
        row["total_paid_amount"] += appointment_paid_amount
        row["total_remaining_amount"] += latest_remaining_amount

        if latest_payment.payment_status == PAYMENT_STATUS_COMPLETED:
            completed_appointments += 1
            completed_paid_amount += appointment_paid_amount
            row["completed_appointments"] += 1
            row["completed_paid_amount"] += appointment_paid_amount

        elif latest_payment.payment_status == PAYMENT_STATUS_CANCELLED:
            cancelled_appointments += 1
            cancelled_paid_amount += appointment_paid_amount
            row["cancelled_appointments"] += 1
            row["cancelled_paid_amount"] += appointment_paid_amount

        else:
            partial_appointments += 1
            partial_paid_amount += appointment_paid_amount
            row["partial_appointments"] += 1
            row["partial_paid_amount"] += appointment_paid_amount

    completed_rate = (
        round((completed_appointments / total_sales_appointments) * 100, 2)
        if total_sales_appointments
        else 0.0
    )
    partial_rate = (
        round((partial_appointments / total_sales_appointments) * 100, 2)
        if total_sales_appointments
        else 0.0
    )
    cancelled_rate = (
        round((cancelled_appointments / total_sales_appointments) * 100, 2)
        if total_sales_appointments
        else 0.0
    )

    product_breakdown = []
    revenue_by_product = []

    for row in sorted(
        product_breakdown_map.values(),
        key=lambda item: (-item["total_sales_appointments"], item["product_name"]),
    ):
        total_for_product = row["total_sales_appointments"]

        serialized_row = {
            "product_id": row["product_id"],
            "product_name": row["product_name"],
            "product_slug": row["product_slug"],
            "total_sales_appointments": total_for_product,
            "completed_appointments": row["completed_appointments"],
            "partial_appointments": row["partial_appointments"],
            "cancelled_appointments": row["cancelled_appointments"],
            "completed_rate": round(
                (row["completed_appointments"] / total_for_product) * 100, 2
            )
            if total_for_product
            else 0.0,
            "partial_rate": round(
                (row["partial_appointments"] / total_for_product) * 100, 2
            )
            if total_for_product
            else 0.0,
            "cancelled_rate": round(
                (row["cancelled_appointments"] / total_for_product) * 100, 2
            )
            if total_for_product
            else 0.0,
            "total_paid_amount": _money(row["total_paid_amount"]),
            "completed_paid_amount": _money(row["completed_paid_amount"]),
            "partial_paid_amount": _money(row["partial_paid_amount"]),
            "cancelled_paid_amount": _money(row["cancelled_paid_amount"]),
            "total_remaining_amount": _money(row["total_remaining_amount"]),
        }

        product_breakdown.append(serialized_row)
        revenue_by_product.append(
            {
                "product_id": row["product_id"],
                "product_name": row["product_name"],
                "product_slug": row["product_slug"],
                "total_paid_amount": _money(row["total_paid_amount"]),
            }
        )

    payment_trend_qs = (
        payments.annotate(day=TruncDate("payment_date"))
        .values("day")
        .annotate(
            total_payment_rows=Count("id"),
            total_paid_amount=Sum("paid_amount"),
        )
        .order_by("day")
    )

    payment_trend = [
        {
            "day": row["day"].isoformat() if row["day"] else None,
            "total_payment_rows": row["total_payment_rows"],
            "total_paid_amount": _money(row["total_paid_amount"]),
        }
        for row in payment_trend_qs
    ]

    return {
        "date_range": {
            "start": start_dt.isoformat(),
            "end": end_dt.isoformat(),
        },
        "filters": {
            "user": _serialize_user_filter(target_user),
            "product": _serialize_product(target_product),
        },
        "summary": {
            "total_sales_appointments": total_sales_appointments,
            "total_payment_rows": total_payment_rows,
            "completed_appointments": completed_appointments,
            "partial_appointments": partial_appointments,
            "cancelled_appointments": cancelled_appointments,
            "completed_rate": completed_rate,
            "partial_rate": partial_rate,
            "cancelled_rate": cancelled_rate,
            "total_paid_amount": _money(total_paid_amount),
            "completed_paid_amount": _money(completed_paid_amount),
            "partial_paid_amount": _money(partial_paid_amount),
            "cancelled_paid_amount": _money(cancelled_paid_amount),
            "total_remaining_amount": _money(total_remaining_amount),
        },
        "tables": {
            "product_breakdown": product_breakdown,
        },
        "charts": {
            "revenue_by_product": revenue_by_product,
            "payment_trend": payment_trend,
        },
    }

def build_product_price_distribution_summary(
    *,
    start_dt,
    end_dt,
    target_user=None,
    target_product=None,
):
    first_payment_qs = AppointmentPayment.objects.filter(
        appointment_id=OuterRef("pk")
    ).order_by("payment_date", "created_at", "id")

    latest_payment_qs = AppointmentPayment.objects.filter(
        appointment_id=OuterRef("pk")
    ).order_by("-payment_date", "-created_at", "-id")

    appointments = Appointment.objects.filter(
        status=APPOINTMENT_STATUS_SALES,
        product__isnull=False,
    )

    if target_user is not None:
        appointments = appointments.filter(customer__assigned_to=target_user)

    if target_product is not None:
        appointments = appointments.filter(product=target_product)

    appointments = appointments.annotate(
        first_payment_date=Subquery(first_payment_qs.values("payment_date")[:1]),
        latest_total_amount=Subquery(latest_payment_qs.values("total_amount")[:1]),
    ).filter(
        first_payment_date__isnull=False,
        first_payment_date__gte=start_dt,
        first_payment_date__lt=end_dt,
    )

    appointment_rows = list(
        appointments.values(
            "id",
            "product_id",
            "product__name",
            "product__slug",
            "latest_total_amount",
        )
    )

    if not appointment_rows:
        return {
            "date_range": {
                "start": start_dt.isoformat(),
                "end": end_dt.isoformat(),
            },
            "filters": {
                "user": _serialize_user_filter(target_user),
                "product": _serialize_product(target_product),
            },
            "summary": {
                "total_sales_count": 0,
                "total_expected_amount": 0.0,
                "total_collected_amount": 0.0,
                "total_remaining_amount": 0.0,
                "overall_collection_rate": 0.0,
            },
            "tables": {
                "price_distribution": [],
            },
        }

    appointment_ids = [row["id"] for row in appointment_rows]

    payments = (
        AppointmentPayment.objects.filter(appointment_id__in=appointment_ids)
        .order_by("appointment_id", "payment_date", "created_at", "id")
    )

    payment_totals_by_appointment = defaultdict(
        lambda: {
            "collected_total": Decimal("0.00"),
            "remaining_total": None,
        }
    )

    for payment in payments:
        payment_totals_by_appointment[payment.appointment_id]["collected_total"] += (
            payment.paid_amount or Decimal("0.00")
        )
        payment_totals_by_appointment[payment.appointment_id]["remaining_total"] = (
            payment.remaining_amount
        )

    grouped_rows = {}

    for row in appointment_rows:
        appointment_id = row["id"]
        product_id = row["product_id"]
        product_name = row["product__name"]
        product_slug = row["product__slug"]
        sale_price = row["latest_total_amount"] or Decimal("0.00")

        collected_total = payment_totals_by_appointment[appointment_id][
            "collected_total"
        ]
        remaining_total = payment_totals_by_appointment[appointment_id][
            "remaining_total"
        ]

        if remaining_total is None:
            remaining_total = max(sale_price - collected_total, Decimal("0.00"))

        key = (product_id, sale_price)

        if key not in grouped_rows:
            grouped_rows[key] = {
                "product_id": product_id,
                "product_name": product_name,
                "product_slug": product_slug,
                "sale_price": sale_price,
                "sale_count": 0,
                "expected_total": Decimal("0.00"),
                "collected_total": Decimal("0.00"),
                "remaining_total": Decimal("0.00"),
            }

        grouped_rows[key]["sale_count"] += 1
        grouped_rows[key]["expected_total"] += sale_price
        grouped_rows[key]["collected_total"] += collected_total
        grouped_rows[key]["remaining_total"] += remaining_total

    price_distribution = []

    total_sales_count = 0
    total_expected_amount = Decimal("0.00")
    total_collected_amount = Decimal("0.00")
    total_remaining_amount = Decimal("0.00")

    for row in sorted(
        grouped_rows.values(),
        key=lambda item: (item["product_name"].lower(), item["sale_price"]),
    ):
        expected_total = row["expected_total"] or Decimal("0.00")
        collected_total = row["collected_total"] or Decimal("0.00")
        remaining_total = row["remaining_total"] or Decimal("0.00")
        sale_count = row["sale_count"] or 0

        collection_rate = (
            round((collected_total / expected_total) * 100, 2)
            if expected_total
            else 0.0
        )

        price_distribution.append(
            {
                "product_id": row["product_id"],
                "product_name": row["product_name"],
                "product_slug": row["product_slug"],
                "sale_price": _money(row["sale_price"]),
                "sale_count": sale_count,
                "expected_total": _money(expected_total),
                "collected_total": _money(collected_total),
                "remaining_total": _money(remaining_total),
                "collection_rate": collection_rate,
            }
        )

        total_sales_count += sale_count
        total_expected_amount += expected_total
        total_collected_amount += collected_total
        total_remaining_amount += remaining_total

    overall_collection_rate = (
        round((total_collected_amount / total_expected_amount) * 100, 2)
        if total_expected_amount
        else 0.0
    )

    return {
        "date_range": {
            "start": start_dt.isoformat(),
            "end": end_dt.isoformat(),
        },
        "filters": {
            "user": _serialize_user_filter(target_user),
            "product": _serialize_product(target_product),
        },
        "summary": {
            "total_sales_count": total_sales_count,
            "total_expected_amount": _money(total_expected_amount),
            "total_collected_amount": _money(total_collected_amount),
            "total_remaining_amount": _money(total_remaining_amount),
            "overall_collection_rate": overall_collection_rate,
        },
        "tables": {
            "price_distribution": price_distribution,
        },
    }