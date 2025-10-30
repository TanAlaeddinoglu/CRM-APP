from django.contrib import admin

from .models import Appointment, AppointmentPayment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("name", "customer", "scheduled_for", "status", "product")
    search_fields = ("name", "customer__customer_name", "customer__customer_surname")
    list_filter = ("status", "appointment_type", "product")
    raw_id_fields = ("customer", "product", "created_by", "updated_by")


@admin.register(AppointmentPayment)
class AppointmentPaymentAdmin(admin.ModelAdmin):
    list_display = ("appointment", "total_amount", "paid_amount", "remaining_amount", "payment_status")
    list_filter = ("payment_status",)
    raw_id_fields = ("appointment", "created_by", "updated_by")
