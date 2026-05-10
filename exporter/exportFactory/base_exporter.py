from abc import ABC, abstractmethod


class BaseExporter(ABC):
    file_type = ""
    file_extension = ""

    @abstractmethod
    def export(self, headers: list[str], rows: list[list[object]]) -> bytes:
        raise NotImplementedError
