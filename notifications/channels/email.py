from .base import BaseChannel


class EmailChannel(BaseChannel):
    def send(
        self, rule, recipient, title: str, body: str, payload: dict, target
    ) -> None:
        # E-postası olmayan alıcı için boş gönderim denemesi yapma.
        if not getattr(recipient, "email", None):
            return

        # Asenkron: her e-posta kendi Celery task'inde, kendi retry'ıyla gider;
        # dispatch task'i ve in_app üretimi SMTP'yi beklemez.
        from notifications.tasks import send_notification_email_task

        send_notification_email_task.delay(recipient.pk, title, body)
