from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models
from django.utils.translation import gettext_lazy as _

class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", _("Admin")
        USER = "USER", _("User")

    # Optional role field for quick checks
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.USER,
    )

    # Keep Django’s groups & permissions
    groups = models.ManyToManyField(
        Group,
        related_name="customuser_set",
        blank=True,
        help_text=_("The groups this user belongs to."),
    )
    user_permissions = models.ManyToManyField(
        Permission,
        related_name="customuser_set",
        blank=True,
        help_text=_("Specific permissions for this user."),
    )

    def is_admin(self):
        """Custom shortcut check"""
        return self.role == self.Role.ADMIN or self.is_superuser

    def save(self, *args, **kwargs):
        """Keep is_staff aligned with the selected role."""
        if self.is_superuser:
            self.is_staff = True
        else:
            self.is_staff = self.role == self.Role.ADMIN

        update_fields = kwargs.get("update_fields")
        if update_fields is not None:
            update_fields = set(update_fields)
            update_fields.add("is_staff")
            kwargs["update_fields"] = list(update_fields)

        super().save(*args, **kwargs)

    def __str__(self):
        return self.username
    