import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class BaseChannel(ABC):
    @abstractmethod
    def send(
        self, rule, recipient, title: str, body: str, payload: dict, target
    ) -> None:
        raise NotImplementedError

    def send_bulk(
        self, rule, recipients, title: str, body: str, payload: dict, target
    ) -> int:
        """Send to each recipient; returns the number of failed sends."""
        failures = 0
        for recipient in recipients:
            try:
                self.send(rule, recipient, title, body, payload, target)
            except Exception:
                logger.exception(
                    "%s.send failed for recipient %s, rule %s",
                    type(self).__name__,
                    recipient.pk,
                    rule.pk,
                )
                failures += 1
        return failures
