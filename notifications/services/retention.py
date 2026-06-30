import logging
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Literal

from django.db import models
from django.utils import timezone

logger = logging.getLogger(__name__)


@dataclass
class RetentionPolicy:
    name: str
    model: type[models.Model]
    filter_kwargs: dict
    age_field: str
    retention_age: timedelta
    batch_size: int = 1000
    action: Literal["delete", "reset"] = "delete"
    reset_kwargs: dict = field(default_factory=dict)


class RetentionService:
    def run_all(self, policies: list[RetentionPolicy]) -> dict[str, int]:
        stats = {}
        for policy in policies:
            try:
                stats[policy.name] = self._run(policy)
            except Exception:
                logger.exception("Retention policy '%s' failed", policy.name)
                stats[policy.name] = -1
        return stats

    def _run(self, policy: RetentionPolicy) -> int:
        cutoff = timezone.now() - policy.retention_age
        age_filter = {f"{policy.age_field}__lt": cutoff}
        total = 0

        while True:
            ids = list(
                policy.model.objects.filter(
                    **policy.filter_kwargs, **age_filter
                ).values_list("pk", flat=True)[: policy.batch_size]
            )
            if not ids:
                break

            qs = policy.model.objects.filter(pk__in=ids)

            if policy.action == "reset":
                affected = qs.update(**policy.reset_kwargs)
            else:
                affected, _ = qs.delete()

            total += affected
            if affected < policy.batch_size:
                break

        if total:
            logger.info(
                "Retention '%s': %d kayıt %s", policy.name, total, policy.action
            )
        return total


def build_default_policies() -> list[RetentionPolicy]:
    from django.conf import settings
    from notifications.models import Notification
    from notifications.reminders.models import ScheduledNotification

    Status = ScheduledNotification.Status

    return [
        RetentionPolicy(
            name="read_notifications",
            model=Notification,
            filter_kwargs={"is_read": True},
            age_field="created_at",
            retention_age=timedelta(
                days=getattr(settings, "NOTIFICATION_RETENTION_DAYS", 7)
            ),
        ),
        RetentionPolicy(
            name="cancelled_reminders",
            model=ScheduledNotification,
            filter_kwargs={"status": Status.CANCELLED},
            age_field="updated_at",
            retention_age=timedelta(
                days=getattr(settings, "REMINDER_CANCELLED_RETENTION_DAYS", 7)
            ),
        ),
        RetentionPolicy(
            name="sent_reminders",
            model=ScheduledNotification,
            filter_kwargs={"status": Status.SENT},
            age_field="sent_at",
            retention_age=timedelta(
                days=getattr(settings, "REMINDER_SENT_RETENTION_DAYS", 30)
            ),
        ),
        RetentionPolicy(
            name="stale_processing_reminders",
            model=ScheduledNotification,
            filter_kwargs={"status": Status.PROCESSING},
            age_field="updated_at",
            retention_age=timedelta(
                hours=getattr(settings, "REMINDER_STALE_PROCESSING_HOURS", 1)
            ),
            action="reset",
            reset_kwargs={"status": Status.PENDING},
        ),
    ]
