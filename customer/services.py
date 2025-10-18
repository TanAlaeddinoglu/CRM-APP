from rest_framework.exceptions import NotFound


def is_admin_or_assigned_to_user(request, customer, user):
    is_admin = getattr(user, "is_staff", False) or getattr(user, "is_superuser", False)

    if not is_admin and customer.assigned_to_id != user.id:
        raise NotFound({"detail": "Not found."})
