"""Environment-driven settings: SQLite locally, PostgreSQL and S3 in Compose."""

import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DEBUG = os.getenv("DJANGO_DEBUG", "0") == "1"
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "development-only-change-before-deployment")
if not DEBUG and SECRET_KEY == "development-only-change-before-deployment":
    raise RuntimeError("Set DJANGO_SECRET_KEY or DJANGO_DEBUG=1 for local development")
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,backend,testserver").split(
    ","
)
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "cms",
]
MIDDLEWARE = [
    "cms.errors.DatabaseErrorMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "config.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "APP_DIRS": True,
        "DIRS": [BASE_DIR / "templates"],
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]
WSGI_APPLICATION = "config.wsgi.application"
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}
if os.getenv("POSTGRES_HOST"):
    DATABASES["default"] = {
        "ENGINE": "django.db.backends.postgresql",
        "HOST": os.environ["POSTGRES_HOST"],
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
        "NAME": os.environ["POSTGRES_DB"],
        "USER": os.environ["POSTGRES_USER"],
        "PASSWORD": os.environ["POSTGRES_PASSWORD"],
    }
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
LANGUAGE_CODE = "ru-ru"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
CSRF_TRUSTED_ORIGINS = os.getenv(
    "CSRF_TRUSTED_ORIGINS", "http://localhost:8080,http://127.0.0.1:5173"
).split(",")
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
SECURE_SSL_REDIRECT = not DEBUG
SECURE_REDIRECT_EXEMPT = [r"^api/health/$"]
SECURE_HSTS_SECONDS = int(os.getenv("DJANGO_HSTS_SECONDS", "0" if DEBUG else "3600"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv("DJANGO_HSTS_INCLUDE_SUBDOMAINS", "0") == "1"
SECURE_HSTS_PRELOAD = os.getenv("DJANGO_HSTS_PRELOAD", "0") == "1"
# These two opt-ins affect the entire domain and require the domain owner's decision.
# Keep all other deployment warnings fatal in production startup.
SILENCED_SYSTEM_CHECKS = ["security.W005", "security.W021"]
if os.getenv("DJANGO_TRUST_PROXY_HEADERS", "0") == "1":
    # Enable only behind the isolated HTTPS proxy; never expose Gunicorn directly.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
if os.getenv("REDIS_URL"):
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": os.environ["REDIS_URL"],
        }
    }
DATA_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024


def positive_env_int(name, default, maximum):
    value = int(os.getenv(name, str(default)))
    if not 1 <= value <= maximum:
        raise ValueError(f"{name} must be between 1 and {maximum}")
    return value


MAX_IMAGE_UPLOAD_MB = positive_env_int("MAX_IMAGE_UPLOAD_MB", 10, 1024)
MAX_VIDEO_UPLOAD_MB = positive_env_int("MAX_VIDEO_UPLOAD_MB", 50, 1024)
# Nginx needs room for multipart boundaries as well as the file itself.
MAX_REQUEST_UPLOAD_MB = max(MAX_IMAGE_UPLOAD_MB, MAX_VIDEO_UPLOAD_MB) + 1
REST_FRAMEWORK = {
    "EXCEPTION_HANDLER": "cms.errors.api_exception_handler",
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAdminUser"],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "120/hour",
        "user": "600/hour",
        "login": os.getenv("LOGIN_THROTTLE_RATE", "10/hour"),
        "lead": "10/hour",
    },
}
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=10),
    "REFRESH_TOKEN_LIFETIME": timedelta(hours=8),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}
if os.getenv("S3_ENDPOINT_URL"):
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3.S3Storage",
            "OPTIONS": {
                "endpoint_url": os.environ["S3_ENDPOINT_URL"],
                "access_key": os.environ["S3_ACCESS_KEY"],
                "secret_key": os.environ["S3_SECRET_KEY"],
                "bucket_name": os.getenv("S3_BUCKET", "terraklink"),
                "region_name": "us-east-1",
                "querystring_auth": False,
                "custom_domain": os.getenv("S3_PUBLIC_DOMAIN", "localhost:8080/storage/terraklink"),
                "url_protocol": "http:" if DEBUG else "https:",
                "file_overwrite": False,
            },
        },
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    }
