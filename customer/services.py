from rest_framework.exceptions import NotFound


def is_admin_or_assigned_to_user(request, customer, user):
    is_admin = getattr(user, "is_staff", False) or getattr(user, "is_superuser", False)

    if not is_admin and customer.assigned_to_id != user.id:
        raise NotFound({"detail": "Not found."})


def move_to_customer_pool(customer, *, by=None):
    """
    When a customer's tag is cleared, drop the assignment so it returns to the pool.
    Returns True if unassignment happened, False otherwise.
    """
    if customer.tag_id is not None or customer.assigned_to_id is None:
        return False

    customer.assigned_to = None
    update_fields = ["assigned_to", "updated_at"]

    if by is not None:
        customer.updated_by = by
        update_fields.append("updated_by")

    customer.save(update_fields=update_fields)
    return True


def move_to_customer(customer, *, user, by=None, tag_id=None):
    if customer.assigned_to_id is not None:
        return False

    if tag_id is not None:
        customer.tag_id = tag_id
    elif customer.tag_id is None:
        return False

    customer.assigned_to = user
    update_fields = ["assigned_to", "updated_at"]
    if tag_id is not None:
        update_fields.append("tag_id")

    if by is not None:
        customer.updated_by = by
        update_fields.append("updated_by")
    customer.save(update_fields=update_fields)
    return True
