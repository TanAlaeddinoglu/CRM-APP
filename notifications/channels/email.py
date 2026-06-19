from .base import BaseChannel


class EmailChannel(BaseChannel):
    def send(
        self, rule, recipient, title: str, body: str, payload: dict, target
    ) -> None:
        from notifications.mail.services import send_email_notification

        send_email_notification(
            subject=title,
            body=body,
            to_emails=[recipient.email],
        )
