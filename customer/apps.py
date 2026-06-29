from django.apps import AppConfig


class CustomerConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "customer"

    def ready(self):
        # Register CustomerImporter with the global importer registry.
        # Import is deferred to ready() to ensure all models are loaded first.
        from customer.importers.registry import register
        register()
