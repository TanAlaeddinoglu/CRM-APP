# Notifications mail domain package.
from .services import (
    MailConfigurationInput,
    delete_mail_configuration,
    get_active_mail_configuration,
    save_mail_configuration,
    send_email_notification,
    test_mail_configuration,
)
from .runtime import EmailDeliveryService

__all__ = [
    "EmailDeliveryService",
    "MailConfigurationInput",
    "delete_mail_configuration",
    "get_active_mail_configuration",
    "save_mail_configuration",
    "send_email_notification",
    "test_mail_configuration",
]
