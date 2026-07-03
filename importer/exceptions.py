from __future__ import annotations


class ImporterNotFound(ValueError):
    """Raised when no importer is registered for the given model_key."""


class ImportSourceError(Exception):
    """Raised when reading from an import source fails."""


class ImportJobError(Exception):
    """Raised when an import job cannot be started or processed."""
