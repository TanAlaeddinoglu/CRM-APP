class EmailDeliveryError(Exception):
    def __init__(
        self,
        email_log,
        message="Email delivery failed.",
        *,
        user_message=None,
        status_code=503,
    ):
        super().__init__(message)
        self.email_log = email_log
        self.message = message
        self.user_message = user_message or message
        self.status_code = status_code
