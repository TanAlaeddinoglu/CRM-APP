from datetime import date

from django.core.validators import RegexValidator
from django.db import models, transaction
from django.utils.text import slugify

from accounts.models import CustomUser
from common.utils import STATUS_CHOICES, SOURCE_CHOICES, COLOUR_CHOICES
from .services import move_to_customer_pool, move_to_customer


class Tag(models.Model):
    tag_name = models.CharField(max_length=50)
    slug = models.SlugField(unique=True, null=False, blank=False)
    color = models.CharField(
        max_length=7,
        choices=COLOUR_CHOICES,
    )

    description = models.TextField(max_length=100)

    def __str__(self):
        return f"{self.tag_name} - {self.description}"

    def save(self, *args, **kwargs):
        if not self.slug and self.tag_name:
            base = slugify(self.tag_name) or "tag"
            candidate = base
            i = 2
            # ensure uniqueness (also exclude self when updating)
            while Tag.objects.filter(slug=candidate).exclude(pk=self.pk).exists():
                candidate = f"{base}-{i}"
                i += 1
            self.slug = candidate
        super().save(*args, **kwargs)


class Customer(models.Model):
    customer_name = models.CharField(max_length=50)
    customer_surname = models.CharField(max_length=50, blank=True)
    customer_email = models.EmailField(max_length=50, null=True, blank=True)
    email_normalized = models.EmailField(editable=False)
    customer_phone = models.CharField(
        max_length=13,
        blank=True,
        validators=[
            RegexValidator(
                regex=r"^[\+]?[0-9]{10,13}$", message="Provide a valid phone number."
            )
        ],
    )

    date_of_birth = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    city = models.CharField(max_length=50, null=True, blank=True)
    assigned_to = models.ForeignKey(
        CustomUser,
        on_delete=models.RESTRICT,
        related_name="assigned_customers",
        null=True,
        blank=True,
    )
    tag = models.ForeignKey(
        Tag,
        on_delete=models.RESTRICT,
        related_name="customers",
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        related_name="created_customers",
        null=True,
        blank=True,
    )
    updated_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        related_name="updated_customers",
        null=True,
        blank=True,
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="active")
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES, default="excel")
    archived_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("customer_phone",)),
            models.Index(fields=("status",)),
        ]

    def __str__(self):
        return f"{self.customer_name} {self.customer_surname}"

    def full_name(self):
        return f"{self.customer_name} {self.customer_surname}".strip()

    def age(self):
        if not self.date_of_birth:
            return None
        today = date.today()
        years = today.year - self.date_of_birth.year
        if (today.month, today.day) < (
            self.date_of_birth.month,
            self.date_of_birth.day,
        ):
            years -= 1
        return years

    def save(self, *args, **kwargs):
        self.is_active = self.status == "active"
        self.email_normalized = (self.customer_email or "").strip().lower()
        super().save(*args, **kwargs)

    @transaction.atomic
    def set_current_tag(
        self,
        new_tag: Tag | None,
        *,
        by: CustomUser | None = None,
        assign_to: CustomUser | None = None,
        notes: str | None = None,
    ) -> bool:
        """
        Atomically change current tag and record a transition in history.
        """
        Customer.objects.select_for_update().get(pk=self.pk)
        old = self.tag
        if (old is None and new_tag is None) or (
            old and new_tag and old.id == new_tag.id
        ):
            return False

        CustomerTagHistory.objects.create(
            customer=self,
            from_tag=old,
            to_tag=new_tag,
            changed_by=by,
            notes=notes,
        )
        self.tag = new_tag
        update_fields = ["tag", "updated_at"]
        if by is not None:
            self.updated_by = by
            update_fields.append("updated_by")
        self.save(update_fields=update_fields)
        if new_tag is None:
            move_to_customer_pool(self, by=by)
            return True

        if self.assigned_to_id is None:
            assignee = assign_to or by
            if assignee is not None:
                move_to_customer(self, user=assignee, by=by, tag_id=new_tag.id)

        return True

    def set_pool(
        self,
        *,
        new_tag: Tag | None = None,
        by: CustomUser | None = None,
        assign_to: CustomUser | None = None,
    ):
        """
        Move to pool (clear tag/assignee) unless both tag and assignee are provided,
        in which case assign with the given tag.
        """
        Customer.objects.select_for_update().get(pk=self.pk)
        old = self.tag

        if assign_to is None or new_tag is None:
            moved = move_to_customer_pool(self, by=by)
        else:
            moved = move_to_customer(self, user=assign_to, by=by, tag_id=new_tag.id)

        if moved:
            CustomerTagHistory.objects.create(
                customer=self,
                from_tag=old,
                to_tag=new_tag,
                changed_by=by,
                notes=None,
            )

        return moved


class CustomerTagHistory(models.Model):
    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name="tag_history"
    )
    from_tag = models.ForeignKey(
        Tag,
        on_delete=models.RESTRICT,
        related_name="history_from",
        blank=True,
        null=True,
    )
    to_tag = models.ForeignKey(
        Tag,
        on_delete=models.RESTRICT,
        related_name="history_to",
        null=True,
        blank=True,
    )
    changed_at = models.DateTimeField(auto_now_add=True)
    changed_by = models.ForeignKey(
        CustomUser,
        on_delete=models.RESTRICT,
        related_name="tag_changes",
        null=True,
        blank=True,
    )
    notes = models.TextField(blank=True, null=True, max_length=500)

    class Meta:
        ordering = ("-changed_at",)
        indexes = [
            models.Index(fields=("customer",)),
            models.Index(fields=("changed_at",)),
        ]

    def __str__(self):
        return f"{self.customer} : {self.from_tag} -> {self.to_tag} ({self.changed_at:%Y-%m-%d})"


class Notes(models.Model):
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="customer_notes",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        related_name="customer_notes_created_by",
        null=True,
        blank=True,
    )
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        related_name="notes_updated_by",
        null=True,
        blank=True,
    )
    note = models.TextField(max_length=1000)

    def __str__(self):
        return f"{self.customer} : {self.note}"
