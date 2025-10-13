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

    def __str__(self):
        return self.username