from django.db import transaction
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from accounts.authenticate import CustomAuthentication
from customer.customerBulkSerializers import (
    CustomerBulkCreateSerializer,
    CustomerBulkUpdateSerializer,
    CustomerBulkDeleteSerializer,
)
from customer.models import Customer, Tag, CustomerTagHistory
from common.utils import DEFAULT_TAG_ID
from customer.services import move_to_customer_pool


class CustomerBulkView(APIView):
    authentication_classes = [CustomAuthentication]
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method in ("POST", "DELETE"):
            return [IsAuthenticated(), IsAdminUser()]
        return [IsAuthenticated()]

    @transaction.atomic
    def post(self, request):
        serializer = CustomerBulkCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        items = serializer.validated_data["items"]
        user = request.user
        now = timezone.now()

        customers = []
        tag_actions = []

        for item in items:
            assigned_to_id = item.pop("assigned_to", None)
            tag_id = item.pop("tag", None)

            customer = Customer(
                **item,
                created_by=user,
                updated_by=user,
                created_at=now,
                updated_at=now,
            )

            if assigned_to_id is not None and tag_id is not None:
                customer.assigned_to_id = assigned_to_id
                customer.status = "active"
                customer.is_active = True
                tag_actions.append((customer, tag_id))
            else:
                customer.status = "pool"
                customer.is_active = False

            customers.append(customer)

        Customer.objects.bulk_create(customers)

        if tag_actions:
            tag_map = Tag.objects.in_bulk({tag_id for _, tag_id in tag_actions})
            for customer, tag_id in tag_actions:
                tag = tag_map.get(tag_id)
                if tag is not None:
                    customer.set_current_tag(
                        tag, by=user, assign_to=customer.assigned_to
                    )

        return Response(
            {"created_count": len(customers)},
            status=status.HTTP_201_CREATED,
        )

    @transaction.atomic
    def patch(self, request):
        serializer = CustomerBulkUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        items = serializer.validated_data["items"]
        ids = [it["id"] for it in items]

        customers = list(Customer.objects.select_for_update().filter(id__in=ids))
        cmap = {c.id: c for c in customers}
        default_tag = get_default_tag()

        tag_ops = []
        assigned_became_non_null = []
        tag_history_rows = []
        now = timezone.now()

        for it in items:
            c = cmap[it["id"]]
            old_tag = c.tag
            old_assigned = c.assigned_to_id

            status_value = it.get("status")
            status_clears = apply_status_rules(c, status_value)
            if status_value == "archived" and old_tag is not None:
                tag_history_rows.append(
                    CustomerTagHistory(
                        customer=c,
                        from_tag=old_tag,
                        to_tag=None,
                        changed_by=user,
                    )
                )

            for f in (
                "customer_phone",
                "customer_name",
                "customer_surname",
                "customer_email",
            ):
                if f in it:
                    setattr(c, f, it[f])

            if "assigned_to_id" in it and not status_clears:
                c.assigned_to_id = it.get("assigned_to_id")
                if old_assigned is None and c.assigned_to_id is not None:
                    assigned_became_non_null.append(c)

            if "tag_id" in it and not status_clears:
                tag_ops.append((c, it.get("tag_id")))

            c.updated_by = user
            c.updated_at = now

        Customer.objects.bulk_update(
            customers,
            [
                "customer_phone",
                "customer_name",
                "customer_surname",
                "customer_email",
                "status",
                "is_active",
                "archived_at",
                "assigned_to",
                "tag",
                "updated_by",
                "updated_at",
            ],
        )

        if tag_history_rows:
            CustomerTagHistory.objects.bulk_create(tag_history_rows)

        # Tag operations (history)
        for c, tag_id in tag_ops:
            tag = None if tag_id is None else Tag.objects.get(id=tag_id)
            c.set_current_tag(tag, by=user, assign_to=c.assigned_to or user)

        # Default tag assign
        if default_tag:
            for c in assigned_became_non_null:
                c.refresh_from_db(fields=["tag_id", "assigned_to_id"])
                if c.tag_id is None:
                    c.set_current_tag(default_tag, by=user, assign_to=c.assigned_to)

        # Final invariant
        for c in customers:
            c.refresh_from_db(fields=["tag_id", "assigned_to_id", "status"])
            final_enforce_pool_or_active(c, by=user)

        return Response(
            {"updated_count": len(customers)},
            status=status.HTTP_200_OK,
        )

    @transaction.atomic
    def delete(self, request):
        serializer = CustomerBulkDeleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        deleted, _ = Customer.objects.filter(
            id__in=serializer.validated_data["ids"]
        ).delete()

        return Response(
            {"deleted_count": deleted},
            status=status.HTTP_200_OK,
        )


# HELPERS
def get_default_tag():
    if not DEFAULT_TAG_ID:
        return None
    try:
        return Tag.objects.get(pk=DEFAULT_TAG_ID)
    except Tag.DoesNotExist:
        return None


def apply_status_rules(instance, status_value):
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


def final_enforce_pool_or_active(instance, *, by=None):
    """
    Final invariant:
    - tag OR assigned missing  -> pool
    - tag AND assigned present -> active
    """
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
