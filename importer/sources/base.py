from __future__ import annotations

from abc import ABC, abstractmethod


class BaseImportSource(ABC):
    """
    Abstract source that delivers rows as a list of plain dicts.

    Every concrete source must normalize its output to the same flat dict
    format, including an optional `_row_no` key for UI display.
    """

    @abstractmethod
    def read(self) -> list[dict]:
        """Read and return all rows as a list of flat dicts."""
