"""Browser tests always use separate local data, even when PostgreSQL/S3 env exists."""

from .settings import *  # noqa: F403
from .settings import BASE_DIR, REST_FRAMEWORK

QA_ROOT = BASE_DIR.parent / ".local" / "browser-tests"
QA_ROOT.mkdir(parents=True, exist_ok=True)
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": QA_ROOT / "db.sqlite3"}}
MEDIA_ROOT = QA_ROOT / "media"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_THROTTLE_RATES": {
        **REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"],
        "login": "100/hour",
    },
}
