from django.db import models
from django.utils.text import slugify

from accounts.models import CustomUser


class Product(models.Model):
    name = models.CharField(max_length=60, unique=True)
    description = models.TextField(max_length=500, blank=True)
    slug = models.SlugField(unique=True, null=False, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        related_name="products_created",
        null=True,
        blank=True,
    )

    def save(self, *args, **kwargs):
        if not self.slug and self.name:
            base = slugify(self.name) or "product"
            candidate = base
            i = 2
            # ensure uniqueness (also exclude self when updating)
            while Product.objects.filter(slug=candidate).exclude(pk=self.pk).exists():
                candidate = f"{base}-{i}"
                i += 1
            self.slug = candidate

        super().save(*args, **kwargs)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("name",)),
        ]

    def __str__(self) -> str:
        return self.name


class CustomerProduct(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="customer_assignments",
    )
    customer = models.ForeignKey(
        "customer.Customer",
        on_delete=models.CASCADE,
        related_name="products",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        related_name="customer_products_created",
        null=True,
        blank=True,
    )
    updated_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        related_name="customer_products_updated",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=("product", "customer"),
                name="uniq_customer_product",
            )
        ]

    def __str__(self) -> str:
        return f"{self.customer.full_name()} → {self.product.name}"
