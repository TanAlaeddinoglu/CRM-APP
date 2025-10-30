from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from accounts.models import CustomUser
from common.utils import APPOINTMENT_TYPES, APPOINTMENT_STATUS, PAYMENT_STATUS
from customer.models import Customer
from products.models import Product


class Appointment(models.Model):
    name = models.CharField(max_length=100, null=False, blank=False)
    scheduled_for = models.DateTimeField(null=False, blank=False)
    appointment_type = models.CharField(
        max_length=50, choices=APPOINTMENT_TYPES, null=False, blank=False
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="appointments",
        null=False,
        blank=False,
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="appointments",
        null=False,
        blank=False,
    )
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=APPOINTMENT_STATUS,
        default=APPOINTMENT_STATUS[0][0],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        related_name="appointments_created",
        null=True,
        blank=True,
    )
    updated_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        related_name="appointments_updated",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ("-scheduled_for",)
        indexes = [
            models.Index(fields=("scheduled_for",)),
            models.Index(fields=("customer", "scheduled_for")),
        ]

    def __str__(self) -> str:
        return f"{self.name} @ {self.scheduled_for:%Y-%m-%d %H:%M}"


class AppointmentPayment(models.Model):
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        null=False,
        blank=False,
    )
    payment_date = models.DateTimeField(null=False, blank=False)
    paid_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    remaining_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        editable=False,
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS,
        default=PAYMENT_STATUS[0][0],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        related_name="appointment_payments_created",
        null=True,
        blank=True,
    )
    updated_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        related_name="appointment_payments_updated",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("appointment", "created_at")),
        ]

    def __str__(self) -> str:
        return f"{self.appointment} · {self.payment_status}"

    def clean(self):
        super().clean()
        if self.paid_amount > self.total_amount:
            raise ValidationError(
                {"paid_amount": "Paid amount cannot exceed total amount."}
            )

    def save(self, *args, **kwargs):
        self.remaining_amount = (self.total_amount or Decimal("0.00")) - (
            self.paid_amount or Decimal("0.00")
        )
        if self.remaining_amount < Decimal("0.00"):
            self.remaining_amount = Decimal("0.00")
        super().save(*args, **kwargs)
