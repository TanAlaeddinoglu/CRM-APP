from django.utils import timezone

from notifications.models import Notification


class NotificationFeedService:
    @staticmethod
    def list_for_user(user, *, is_read=None, created_after=None, created_before=None):
        qs = Notification.objects.filter(recipient=user).select_related(
            "target_content_type"
        )
        if is_read is not None:
            qs = qs.filter(is_read=is_read)
        if created_after is not None:
            qs = qs.filter(created_at__gte=created_after)
        if created_before is not None:
            qs = qs.filter(created_at__lt=created_before)
        return qs

    @staticmethod
    def mark_read(notification: Notification, user) -> Notification:
        if notification.recipient_id != user.pk:
            raise PermissionError("Cannot mark another user's notification as read.")
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=["is_read", "read_at"])
        return notification

    @staticmethod
    def mark_all_read(user) -> int:
        now = timezone.now()
        return int(
            Notification.objects.filter(recipient=user, is_read=False).update(
                is_read=True, read_at=now
            )
        )

    @staticmethod
    def unread_count(user) -> int:
        return int(Notification.objects.filter(recipient=user, is_read=False).count())

    @staticmethod
    def delete(notification: Notification, user) -> None:
        if notification.recipient_id != user.pk:
            raise PermissionError("Cannot delete another user's notification.")
        notification.delete()

    @staticmethod
    def delete_all(user) -> int:
        deleted, _ = Notification.objects.filter(recipient=user).delete()
        return int(deleted)
