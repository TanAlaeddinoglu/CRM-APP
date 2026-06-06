class SecretStoreError(Exception):
    """Base exception for secret store operations."""


class SecretStoreConfigurationError(SecretStoreError):
    """Raised when the configured secret backend cannot be initialized."""


class SecretNotFoundError(SecretStoreError):
    """Raised when a named secret does not exist in the secret store."""
