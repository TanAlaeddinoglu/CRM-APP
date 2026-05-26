from django.core.cache import cache
from rest_framework.exceptions import Throttled

LOGIN_ATTEMPT_LIMIT = 5
IP_ATTEMPT_LIMIT = 5
BLOCK_TIME = 120  # 2 dakika (saniye)


def user_cache_key(identifier: str) -> str:
    return f"login_attempts:user:{identifier}"


def ip_cache_key(client_ip: str) -> str:
    return f"login_attempts:ip:{client_ip}"


def _raise_throttled() -> None:
    raise Throttled(
        wait=BLOCK_TIME,
        detail="Çok fazla başarısız giriş denemesi yapıldı. "
        "120 saniye sonra tekrar deneyin.",
    )


def check_login_throttle(identifier: str, client_ip: str | None = None):
    if cache.get(user_cache_key(identifier), 0) >= LOGIN_ATTEMPT_LIMIT:
        _raise_throttled()

    if client_ip and cache.get(ip_cache_key(client_ip), 0) >= IP_ATTEMPT_LIMIT:
        _raise_throttled()


def increase_login_attempt(identifier: str, client_ip: str | None = None):
    user_key = user_cache_key(identifier)
    user_attempts = cache.get(user_key, 0) + 1
    cache.set(user_key, user_attempts, timeout=BLOCK_TIME)

    if client_ip:
        key = ip_cache_key(client_ip)
        ip_attempts = cache.get(key, 0) + 1
        cache.set(key, ip_attempts, timeout=BLOCK_TIME)


def reset_login_attempts(identifier: str, client_ip: str | None = None):
    cache.delete(user_cache_key(identifier))
    if client_ip:
        cache.delete(ip_cache_key(client_ip))
