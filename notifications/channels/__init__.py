from .email import EmailChannel
from .in_app import InAppChannel
from .registry import channel_registry

channel_registry.register("in_app", InAppChannel())
channel_registry.register("email", EmailChannel())

__all__ = ["channel_registry", "InAppChannel", "EmailChannel"]
