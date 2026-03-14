class EmailDeliveryError(Exception):
    def __init__(self, email_log, message="Email delivery failed."):
        super().__init__(message)
        self.email_log = email_log
        self.message = message
