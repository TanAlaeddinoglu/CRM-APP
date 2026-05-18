import os
from pathlib import Path
from typing import Any, Dict

from . import settings as base_settings

for name in dir(base_settings):
    if name.isupper():
        globals()[name] = getattr(base_settings, name)

os.environ.setdefault("DEFAULT_FROM_EMAIL", "default-sender@example.com")
os.environ.setdefault("CELERY_BROKER_URL", "memory://")
os.environ.setdefault("CELERY_RESULT_BACKEND", "cache+memory://")


BASE_DIR = Path(__file__).resolve().parent.parent
MEDIA_ROOT = BASE_DIR / "test_media"

DATABASES: Dict[str, Dict[str, Any]] = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "test_db.sqlite3",
    }
}

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
SERVER_EMAIL = "default-sender@example.com"
DEFAULT_FROM_EMAIL = SERVER_EMAIL
SECRET_STORE_BACKEND = "memory"
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "test-login-throttle",
        "TIMEOUT": 120,
    }
}
