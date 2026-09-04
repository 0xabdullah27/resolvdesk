import pytest
from app.core.rate_limiter import SlidingWindowRateLimiter


@pytest.mark.asyncio
async def test_sliding_window_rate_limiter_allows_up_to_max():
    """Verify rate limiter allows up to max_requests and rejects excess."""
    limiter = SlidingWindowRateLimiter(max_requests=5, window_seconds=60)
    client_ip = "192.168.1.100"

    for _ in range(5):
        allowed, retry_after = await limiter.is_allowed(client_ip)
        assert allowed is True
        assert retry_after == 0

    # 6th request is rejected
    allowed, retry_after = await limiter.is_allowed(client_ip)
    assert allowed is False
    assert retry_after > 0
    assert retry_after <= 60


@pytest.mark.asyncio
async def test_sliding_window_rate_limiter_ip_isolation():
    """Verify rate limits are tracked independently per client IP."""
    limiter = SlidingWindowRateLimiter(max_requests=2, window_seconds=60)
    ip_a = "10.0.0.1"
    ip_b = "10.0.0.2"

    assert (await limiter.is_allowed(ip_a))[0] is True
    assert (await limiter.is_allowed(ip_a))[0] is True
    # ip_a is now rate-limited
    assert (await limiter.is_allowed(ip_a))[0] is False

    # ip_b is unaffected
    assert (await limiter.is_allowed(ip_b))[0] is True
    assert (await limiter.is_allowed(ip_b))[0] is True
    assert (await limiter.is_allowed(ip_b))[0] is False


@pytest.mark.asyncio
async def test_sliding_window_rate_limiter_reset():
    """Verify reset() clears tracked requests."""
    limiter = SlidingWindowRateLimiter(max_requests=1, window_seconds=60)
    ip = "127.0.0.1"

    assert (await limiter.is_allowed(ip))[0] is True
    assert (await limiter.is_allowed(ip))[0] is False

    await limiter.reset()
    assert (await limiter.is_allowed(ip))[0] is True
