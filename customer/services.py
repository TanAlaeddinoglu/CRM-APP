from django.apps import apps
from django.db import transaction
from rest_framework.exceptions import NotFound

from customer.helpers import (
    _nullish,
    _phone_candidates,
    _set_customer_products,
)


def _get_customer_models():
    Customer = apps.get_model("customer", "Customer")
    Tag = apps.get_model("customer", "Tag")
    CUSTOMER_FIELDS = {f.name for f in Customer._meta.fields}
    return Customer, Tag, CUSTOMER_FIELDS


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


def move_to_customer(customer, *, user, by=None, tag_id=None):  # noqa: E302
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


class CustomerService:

    # ------------------------------------------------------------------
    # Private status helpers (from customerBulkViews)
    # ------------------------------------------------------------------

    @staticmethod
    def _get_default_tag():
        from common.utils import DEFAULT_TAG_ID
        Tag = apps.get_model("customer", "Tag")
        if not DEFAULT_TAG_ID:
            return None
        try:
            return Tag.objects.get(pk=DEFAULT_TAG_ID)
        except Tag.DoesNotExist:
            return None

    @staticmethod
    def _apply_status_rules(instance, status_value):
        from django.utils import timezone
        if status_value is None:
            return False
        instance.status = status_value
        instance.is_active = status_value == "active"
        instance.archived_at = None
        if status_value == "archived":
            instance.archived_at = timezone.now()
            instance.tag_id = None
            instance.assigned_to_id = None
            return True
        if status_value == "pool":
            instance.tag_id = None
            instance.assigned_to_id = None
            return True
        return False

    @staticmethod
    def _enforce_pool_or_active(instance, *, by=None):
        if instance.status == "archived":
            return
        if instance.tag_id is None or instance.assigned_to_id is None:
            move_to_customer_pool(instance, by=by)
            return
        if instance.status != "active":
            instance.status = "active"
            if by:
                instance.updated_by = by
            instance.save(update_fields=["status", "updated_at", "updated_by"])

    # ------------------------------------------------------------------
    # bulk_create
    # ------------------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def bulk_create(items: list, user) -> dict:
        from django.utils import timezone
        Customer, Tag, CUSTOMER_FIELDS = _get_customer_models()

        tag_ids = {it.get("tag") for it in items if it.get("tag")}
        tags_map = Tag.objects.in_bulk(tag_ids) if tag_ids else {}

        customers = []
        tag_actions = []
        now = timezone.now()

        for it in items:
            assigned_to_id = it.get("assigned_to")
            tag_id = it.get("tag")
            email = it.get("customer_email") or None
            city = (it.get("city") or "").strip() or None

            c = Customer(
                customer_name=it["customer_name"],
                customer_surname=it.get("customer_surname") or "",
                customer_phone=it["customer_phone"],
                created_by=user,
                updated_by=user,
                created_at=now,
                updated_at=now,
            )
            if "customer_email" in CUSTOMER_FIELDS:
                c.customer_email = email
            if "email_normalized" in CUSTOMER_FIELDS:
                c.email_normalized = (email or "").lower()
            if "city" in CUSTOMER_FIELDS and city:
                c.city = city
            if "source" in CUSTOMER_FIELDS and it.get("source"):
                c.source = it["source"]
            if "date_of_birth" in CUSTOMER_FIELDS and it.get("date_of_birth"):
                c.date_of_birth = it["date_of_birth"]

            if assigned_to_id is not None and tag_id is not None:
                if "assigned_to" in CUSTOMER_FIELDS:
                    c.assigned_to_id = assigned_to_id
                c.status = "active"
                c.is_active = True
                tag_actions.append((c, tag_id))
            else:
                c.status = "pool"
                c.is_active = False

            customers.append((c, it.get("products")))

        objs = [c for c, _ in customers]
        Customer.objects.bulk_create(objs, batch_size=500)

        if tag_actions:
            tag_map = Tag.objects.in_bulk({tid for _, tid in tag_actions})
            for c, tid in tag_actions:
                tag = tag_map.get(tid)
                if tag is not None and hasattr(c, "set_current_tag"):
                    c.set_current_tag(tag, by=user, assign_to=c.assigned_to)

        for c, products_str in customers:
            if products_str and not _nullish(products_str):
                try:
                    _set_customer_products(c, products_str, by_user=user)
                except Exception:
                    pass

        return {"created_count": len(objs)}

    # ------------------------------------------------------------------
    # bulk_update
    # ------------------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def bulk_update(items: list, user, request) -> dict:
        from customer.serializers import NotesSerializer
        from django.utils import timezone
        Customer, Tag, CUSTOMER_FIELDS = _get_customer_models()

        ids = [it["id"] for it in items]
        customers = list(Customer.objects.select_for_update().filter(id__in=ids))
        cmap = {c.id: c for c in customers}
        default_tag = CustomerService._get_default_tag()

        tag_ops = []
        assigned_became_non_null = []
        tag_history_rows = []
        note_jobs = []
        product_jobs = []
        now = timezone.now()

        CustomerTagHistory = apps.get_model("customer", "CustomerTagHistory")

        for it in items:
            c = cmap.get(it["id"])
            if not c:
                continue
            old_tag = c.tag
            old_assigned = c.assigned_to_id

            status_clears = CustomerService._apply_status_rules(c, it.get("status"))
            if it.get("status") == "archived" and old_tag is not None:
                tag_history_rows.append(
                    CustomerTagHistory(customer=c, from_tag=old_tag, to_tag=None, changed_by=user)
                )

            for f in ("customer_phone", "customer_name", "customer_surname", "customer_email"):
                if f in it:
                    setattr(c, f, it[f])

            if "customer_email" in it and "email_normalized" in CUSTOMER_FIELDS:
                c.email_normalized = (it.get("customer_email") or "").lower()

            if "city" in it and "city" in CUSTOMER_FIELDS:
                city = (it.get("city") or "").strip()
                if city:
                    c.city = city

            if "assigned_to_id" in it and not status_clears:
                c.assigned_to_id = it.get("assigned_to_id")
                if old_assigned is None and c.assigned_to_id is not None:
                    assigned_became_non_null.append(c)

            if "tag_id" in it and not status_clears:
                tag_ops.append((c, it.get("tag_id")))

            if it.get("note") and not _nullish(it.get("note")):
                note_jobs.append((c, it["note"]))

            if it.get("products") and not _nullish(it.get("products")):
                product_jobs.append((c, it["products"]))

            c.updated_by = user
            c.updated_at = now

        update_fields = [
            "customer_phone", "customer_name", "customer_surname", "customer_email",
            "status", "is_active", "updated_by", "updated_at",
        ]
        for f in ["archived_at", "assigned_to", "tag", "city", "email_normalized"]:
            if f in CUSTOMER_FIELDS:
                update_fields.append(f)

        Customer.objects.bulk_update(customers, update_fields, batch_size=500)

        if tag_history_rows:
            CustomerTagHistory.objects.bulk_create(tag_history_rows)

        for c, tag_id in tag_ops:
            tag = None if tag_id is None else Tag.objects.filter(id=tag_id).first()
            if hasattr(c, "set_current_tag"):
                c.set_current_tag(tag, by=user, assign_to=c.assigned_to or user)

        if default_tag:
            for c in assigned_became_non_null:
                c.refresh_from_db(fields=["tag_id", "assigned_to_id"])
                if c.tag_id is None and hasattr(c, "set_current_tag"):
                    c.set_current_tag(default_tag, by=user, assign_to=c.assigned_to)

        for c in customers:
            c.refresh_from_db(fields=["tag_id", "assigned_to_id", "status"])
            CustomerService._enforce_pool_or_active(c, by=user)

        for c, note_text in note_jobs:
            payload = {"customer_id": c.id, "note": str(note_text)}
            ns = NotesSerializer(data=payload, context={"request": request})
            ns.is_valid(raise_exception=True)
            ns.save()

        for c, products_str in product_jobs:
            try:
                _set_customer_products(c, products_str, by_user=user)
            except Exception:
                pass

        return {
            "updated_count": len(customers),
            "tag_ops_count": len(tag_ops),
            "note_created_count": len(note_jobs),
            "products_updated_count": len(product_jobs),
        }

    # ------------------------------------------------------------------
    # bulk_delete
    # ------------------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def bulk_delete(ids: list, user) -> dict:
        Customer, _, _ = _get_customer_models()
        deleted, _ = Customer.objects.filter(id__in=ids).delete()
        return {"deleted_count": deleted}

