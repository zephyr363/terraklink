import math
from urllib.parse import urlparse

from django.core.validators import URLValidator
from rest_framework import serializers

from .validators import validate_media_url

PUBLIC_PAGES = ("/", "/catalog", "/about", "/projects", "/information", "/dealers", "/contacts")


def validate_site_url(value):
    URLValidator(schemes=["https"])(value)
    if "\\" in value or any(char.isspace() or ord(char) < 32 for char in value):
        raise serializers.ValidationError("Недопустимые символы в адресе сайта.")
    try:
        parsed = urlparse(value)
        hostname = parsed.hostname
        parsed.port
    except ValueError:
        raise serializers.ValidationError("Некорректный адрес сайта.") from None
    if (
        parsed.scheme != "https"
        or not hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.path not in ("", "/")
        or parsed.query
        or parsed.fragment
    ):
        raise serializers.ValidationError("Укажите HTTPS-адрес сайта без пути и параметров.")
    return value.rstrip("/")


class PageSeoSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=120, allow_blank=True, required=False, default="")
    description = serializers.CharField(
        max_length=320, allow_blank=True, required=False, default=""
    )


class FaqSerializer(serializers.Serializer):
    question = serializers.CharField(max_length=200)
    answer = serializers.CharField(max_length=2000)


class SeoSerializer(PageSeoSerializer):
    site_url = serializers.CharField(
        max_length=300, allow_blank=True, required=False, validators=[validate_site_url]
    )
    indexing = serializers.BooleanField(required=False, default=False)
    structured_data = serializers.BooleanField(required=False, default=True)
    ai_summary = serializers.CharField(
        max_length=4000, allow_blank=True, required=False, default=""
    )
    ai_enabled = serializers.BooleanField(required=False, default=True)
    og_image = serializers.CharField(max_length=1000, allow_blank=True, required=False, default="")
    logo = serializers.CharField(max_length=1000, allow_blank=True, required=False, default="")
    legal_name = serializers.CharField(max_length=200, allow_blank=True, required=False, default="")
    city = serializers.CharField(max_length=100, allow_blank=True, required=False, default="")
    region = serializers.CharField(max_length=100, allow_blank=True, required=False, default="")
    postal_code = serializers.CharField(max_length=20, allow_blank=True, required=False, default="")
    latitude = serializers.FloatField(min_value=-90, max_value=90, allow_null=True, required=False)
    longitude = serializers.FloatField(
        min_value=-180, max_value=180, allow_null=True, required=False
    )
    areas_served = serializers.ListField(
        child=serializers.CharField(max_length=100), max_length=30, required=False, default=list
    )
    same_as = serializers.ListField(
        child=serializers.CharField(max_length=1000, validators=[URLValidator(schemes=["https"])]),
        max_length=20,
        required=False,
        default=list,
    )
    faq = FaqSerializer(many=True, required=False, default=list)
    pages = serializers.DictField(child=PageSeoSerializer(), required=False, default=dict)
    google_verification = serializers.RegexField(
        r"^[a-zA-Z0-9_-]{0,150}$", allow_blank=True, required=False, default=""
    )
    yandex_verification = serializers.RegexField(
        r"^[a-zA-Z0-9_-]{0,150}$", allow_blank=True, required=False, default=""
    )

    def validate(self, attrs):
        for key in ("og_image", "logo"):
            validate_media_url(attrs.get(key, ""))
        for value in attrs.get("same_as", []):
            validate_media_url(value)
        for key in ("latitude", "longitude"):
            if attrs.get(key) is not None and not math.isfinite(attrs[key]):
                raise serializers.ValidationError({key: "Укажите конечное число."})
        if len(attrs.get("faq", [])) > 20:
            raise serializers.ValidationError({"faq": "Не более 20 вопросов."})
        if set(attrs.get("pages", {})) - set(PUBLIC_PAGES):
            raise serializers.ValidationError({"pages": "Выберите существующую страницу сайта."})
        if (attrs.get("latitude") is None) != (attrs.get("longitude") is None):
            raise serializers.ValidationError("Укажите обе координаты или оставьте обе пустыми.")
        return attrs
