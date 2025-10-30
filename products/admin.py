from django.contrib import admin

from .models import Product, CustomerProduct


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "created_at", "created_by")
    search_fields = ("name",)
    raw_id_fields = ("created_by",)


@admin.register(CustomerProduct)
class CustomerProductAdmin(admin.ModelAdmin):
    list_display = ("customer", "product", "created_at")
    raw_id_fields = ("customer", "product", "created_by", "updated_by")
