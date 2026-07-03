from __future__ import annotations

from dataclasses import dataclass

from notifications.mail.models import MailConfiguration


@dataclass(frozen=True)
class MailConfigurationInput:
    host: str
    port: int
    host_user: str
    host_password: str
    default_from_email: str
    use_tls: bool
    use_ssl: bool
    name: str = "Default SMTP"


@dataclass(frozen=True)
class ResolvedMailConfiguration:
    source: str
    backend_path: str
    host: str | None
    port: int | None
    host_user: str | None
    host_password: str | None
    use_tls: bool
    use_ssl: bool
    timeout: int | None
    default_from_email: str
    mail_configuration: MailConfiguration | None = None
