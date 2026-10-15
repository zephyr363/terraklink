import re
from urllib.parse import urlparse

from django.core.exceptions import ValidationError


def validate_media_url(value):
    if not value:
        return value
    if "\\" in value or any(ord(char) < 32 for char in value):
        raise ValidationError("Недопустимые символы в ссылке.")
    try:
        parsed = urlparse(value)
        hostname = parsed.hostname
        parsed.port
    except ValueError:
        raise ValidationError("Некорректная ссылка.") from None
    if value.startswith("/") and not value.startswith("//"):
        return value
    if (
        parsed.scheme == "https"
        and hostname
        and parsed.username is None
        and parsed.password is None
    ):
        return value
    # Local S3 URLs are emitted by development storage, never arbitrary HTTP hosts.
    if (
        parsed.scheme == "http"
        and hostname in {"localhost", "127.0.0.1"}
        and parsed.username is None
        and parsed.password is None
    ):
        return value
    raise ValidationError("Используйте HTTPS-ссылку или локальный путь.")


def validate_phone(value):
    if (
        not re.fullmatch(r"[+\d ()-]{10,50}", value)
        or not 10 <= len(re.sub(r"\D", "", value)) <= 15
    ):
        raise ValidationError("Введите корректный телефон (от 10 до 15 цифр).")
