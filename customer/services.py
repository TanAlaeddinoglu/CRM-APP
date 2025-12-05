from rest_framework.exceptions import NotFound


def is_admin_or_assigned_to_user(request, customer, user):
    is_admin = getattr(user, "is_staff", False) or getattr(user, "is_superuser", False)

    if not is_admin and customer.assigned_to_id != user.id:
        raise NotFound({"detail": "Customer is not assigned to this user."})


def move_to_customer_pool(customer, *, by=None):
    """
    Clear tag/assignee and mark as pool when either is missing.
    Returns True if a change was persisted, False otherwise.
    """
    if (
        customer.tag_id is None
        and customer.assigned_to_id is None
        and customer.status == "pool"
    ):
        return False

    update_fields = ["updated_at"]
    changed = False

    if customer.tag_id is not None:
        customer.tag = None
        update_fields.append("tag")
        changed = True
    if customer.assigned_to_id is not None:
        customer.assigned_to = None
        update_fields.append("assigned_to")
        changed = True
    if customer.status != "pool":
        customer.status = "pool"
        update_fields.append("status")
        changed = True
    if by is not None:
        customer.updated_by = by
        update_fields.append("updated_by")
        changed = True

    if not changed:
        return False

    customer.save(update_fields=update_fields)
    return True


def move_to_customer(customer, *, user, by=None, tag_id=None):
    """
    Assign only when currently unassigned and a tag is present.
    Returns True if assignment happened, False otherwise.
    """
    if customer.assigned_to_id is not None:
        return False

    if tag_id is not None:
        customer.tag_id = tag_id
    if customer.tag_id is None:
        return False  # tag is required for assignment

    customer.assigned_to = user
    update_fields = ["assigned_to", "updated_at"]

    if tag_id is not None:
        update_fields.append("tag_id")
    if customer.status != "active":
        customer.status = "active"
        update_fields.append("status")

    if by is not None:
        customer.updated_by = by
        update_fields.append("updated_by")

    customer.save(update_fields=update_fields)
    return True
