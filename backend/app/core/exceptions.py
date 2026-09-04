class ResolvDeskException(Exception):
    """Base exception for domain-specific ResolvDesk errors."""

    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.detail = message
        self.status_code = status_code
        super().__init__(message)


class CapacityLimitException(ResolvDeskException):
    """Raised when an organization reaches its document or quota capacity limit (400)."""

    def __init__(self, message: str = "Organization document limit reached (maximum 50 documents)."):
        super().__init__(message=message, status_code=400)


class DuplicateDocumentException(ResolvDeskException):
    """Raised when a document with the same filename or title already exists in the organization (409)."""

    def __init__(self, message: str = "A document with this filename already exists for this organization."):
        super().__init__(message=message, status_code=409)


class PayloadTooLargeException(ResolvDeskException):
    """Raised when an uploaded file exceeds the maximum allowed size (413)."""

    def __init__(self, message: str = "File size exceeds the 10 MB limit."):
        super().__init__(message=message, status_code=413)


class UnsupportedMediaTypeException(ResolvDeskException):
    """Raised when an uploaded file format is not supported (415)."""

    def __init__(self, message: str = "Unsupported file format. Allowed formats: .pdf, .docx, .txt, .md"):
        super().__init__(message=message, status_code=415)


class UnprocessableContentException(ResolvDeskException):
    """Raised when document content cannot be processed, is empty, or exceeds bounds (422)."""

    def __init__(self, message: str = "Document contains no readable text."):
        super().__init__(message=message, status_code=422)


class CrossStoreSyncException(ResolvDeskException):
    """Raised when cross-store atomicity fails between PostgreSQL and Qdrant (500)."""

    def __init__(
        self,
        message: str = "Failed to purge vector embeddings. Deletion aborted to maintain cross-store consistency.",
    ):
        super().__init__(message=message, status_code=500)


class RateLimitExceededException(ResolvDeskException):
    """Raised when client IP exceeds sliding-window rate limits (429)."""

    def __init__(
        self,
        message: str = "Rate limit exceeded. Please slow down and try again in a moment.",
        retry_after: int = 60,
    ):
        super().__init__(message=message, status_code=429)
        self.retry_after = retry_after
        self.headers = {"Retry-After": str(retry_after)}
