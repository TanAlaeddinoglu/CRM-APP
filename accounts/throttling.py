from django.core.cache import cache
from rest_framework.exceptions import Throttled

LOGIN_ATTEMPT_LIMIT = 5
BLOCK_TIME = 120  # 2 dakika (saniye)


def _cache_key(identifier: str) -> str:
    return f"login_attempts:{identifier}"


def check_login_throttle(identifier: str):
    attempts = cache.get(_cache_key(identifier), 0)

    if attempts >= LOGIN_ATTEMPT_LIMIT:
        raise Throttled(
            wait=BLOCK_TIME,
            detail="Bu hesap çok fazla başarısız giris denemesi yapti. "
            "120 saniye sonra tekrar deneyin.",
        )


def increase_login_attempt(identifier: str):
    key = _cache_key(identifier)
    attempts = cache.get(key, 0) + 1
    cache.set(key, attempts, timeout=BLOCK_TIME)


def reset_login_attempts(identifier: str):
    cache.delete(_cache_key(identifier))
