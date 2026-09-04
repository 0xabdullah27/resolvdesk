import asyncio
import time
from collections import defaultdict, deque
from typing import Dict, Tuple
from fastapi import Request

from app.core.config import settings
from app.core.exceptions import RateLimitExceededException


class SlidingWindowRateLimiter:
    """Thread-safe in-memory sliding window rate limiter for client IPs."""

    def __init__(self, max_requests: int = 30, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: Dict[str, deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def is_allowed(self, client_ip: str) -> Tuple[bool, int]:
        """Check whether the request is allowed under the sliding window.

        Returns (allowed, retry_after_seconds).
        """
        now = time.monotonic()
        window_start = now - self.window_seconds

        async with self._lock:
            timestamps = self._requests[client_ip]

            # Prune timestamps older than current window
            while timestamps and timestamps[0] <= window_start:
                timestamps.popleft()

            if len(timestamps) >= self.max_requests:
                # Oldest request in the window dictates retry-after
                oldest = timestamps[0]
                retry_after = max(1, int(self.window_seconds - (now - oldest)))
                return False, retry_after

            # Add current request timestamp
            timestamps.append(now)
            return True, 0

    async def reset(self) -> None:
        """Clear all tracked request history (useful for testing)."""
        async with self._lock:
            self._requests.clear()


# Default singleton instance for widget chat endpoints
chat_rate_limiter = SlidingWindowRateLimiter(
    max_requests=settings.RATE_LIMIT_CHAT_PER_MINUTE,
    window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS,
)


async def check_chat_rate_limit(request: Request) -> None:
    """FastAPI dependency to enforce rate limiting on visitor chat requests."""
    # Extract client IP, prioritizing proxy headers if available
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    elif request.client and request.client.host:
        client_ip = request.client.host
    else:
        client_ip = "127.0.0.1"

    allowed, retry_after = await chat_rate_limiter.is_allowed(client_ip)
    if not allowed:
        raise RateLimitExceededException(
            message="Rate limit exceeded. Please slow down and try again in a moment.",
            retry_after=retry_after,
        )
