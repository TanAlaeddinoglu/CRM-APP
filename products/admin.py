from django.contrib import admin

from .models import Product, ProductAlias, CustomerProduct


class ProductAliasInline(admin.TabularInline):
    model = ProductAlias
    extra = 1
    fields = ("alias", "alias_normalized")
    readonly_fields = ("alias_normalized",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "created_at", "created_by")
    search_fields = ("name", "slug", "aliases__alias")
    raw_id_fields = ("created_by",)
    inlines = [ProductAliasInline]


@admin.register(ProductAlias)
class ProductAliasAdmin(admin.ModelAdmin):
    list_display = ("alias", "alias_normalized", "product")
    search_fields = ("alias", "alias_normalized", "product__name", "product__slug")
    raw_id_fields = ("product",)


@admin.register(CustomerProduct)
class CustomerProductAdmin(admin.ModelAdmin):
    list_display = ("customer", "product", "created_at")
    raw_id_fields = ("customer", "product", "created_by", "updated_by")
