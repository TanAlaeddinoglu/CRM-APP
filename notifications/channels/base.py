from abc import ABC, abstractmethod


class BaseChannel(ABC):
    @abstractmethod
    def send(
        self, rule, recipient, title: str, body: str, payload: dict, target
    ) -> None:
        raise NotImplementedError
