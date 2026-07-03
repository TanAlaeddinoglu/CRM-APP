from __future__ import annotations


def register() -> None:
    """Register CustomerImporter with the global importer registry."""
    from customer.importers.customer_importer import CustomerImporter
    from importer.registry import registry

    registry.register("customer", CustomerImporter)
