import logging
import sys
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings

# Setup standard logging format
log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
logging.basicConfig(
    level=log_level,
    format="%(asctime)s [%(levelname)s] [%(name)s] [request_id=%(request_id)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

# Custom log record factory to ensure request_id is always present
old_factory = logging.getLogRecordFactory()


def record_factory(*args, **kwargs):
    record = old_factory(*args, **kwargs)
    if not hasattr(record, "request_id"):
        record.request_id = "-"
    return record


logging.setLogRecordFactory(record_factory)
class StructuredLoggerAdapter(logging.LoggerAdapter):
    def process(self, msg, kwargs):
        reserved = {"exc_info", "stack_info", "stacklevel", "extra"}
        extra = kwargs.get("extra", {})
        custom_kwargs = {k: v for k, v in list(kwargs.items()) if k not in reserved}
        for k in custom_kwargs:
            kwargs.pop(k)
        if custom_kwargs:
            extra.update(custom_kwargs)
            msg = f"{msg} | {custom_kwargs}"
        kwargs["extra"] = extra
        return msg, kwargs


def get_logger(name: str = "resolvdesk") -> StructuredLoggerAdapter:
    """Returns a structured logger adapter supporting keyword fields."""
    base_logger = logging.getLogger(name)
    return StructuredLoggerAdapter(base_logger, {})


logger = get_logger("resolvdesk")


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Middleware attaching a unique X-Request-ID to every incoming HTTP request."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        correlation_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.correlation_id = correlation_id

        # Attach request_id to context for logging
        response = await call_next(request)
        response.headers["X-Request-ID"] = correlation_id
        return response
