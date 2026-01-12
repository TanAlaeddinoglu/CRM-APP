from pathlib import Path
from typing import Any, Dict

from .settings import *  # noqa: F401,F403

BASE_DIR = Path(__file__).resolve().parent.parent

DATABASES: Dict[str, Dict[str, Any]] = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "test_db.sqlite3",
    }
}
