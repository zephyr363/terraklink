"""Validate the editor document before it crosses the persistence boundary."""

import re
from urllib.parse import urlparse

from rest_framework import serializers

from .models import Lead


def validate_media_url(value):
    if not value:
        return value
    parsed = urlparse(value)
    if value.startswith("/") and not value.startswith("//"):
        return value
    if parsed.scheme == "https" and parsed.hostname and not parsed.username:
        return value
    # Local S3 URLs are emitted by the development storage, never arbitrary HTTP hosts.
    if parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1"}:
        return value
    raise serializers.ValidationError("Используйте HTTPS-ссылку или локальный путь.")


class ItemSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=80)
    title = serializers.CharField(max_length=200)
    text = serializers.CharField(max_length=2000, required=False, allow_blank=True, default="")
    image = serializers.CharField(
        max_length=1000,
        required=False,
        allow_blank=True,
        default="",
        validators=[validate_media_url],
    )
    category = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    price = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=0, required=False, default=0
    )
    tag = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")


class SectionSerializer(serializers.Serializer):
    id = serializers.RegexField(r"^[a-zA-Z0-9_-]{1,80}$")
    type = serializers.ChoiceField(
        choices=[
            "hero",
            "features",
            "catalog",
            "projects",
            "consultation",
            "about",
            "news",
            "contact",
            "text",
            "image",
            "video",
        ]
    )
    title = serializers.CharField(max_length=300, allow_blank=True)
    subtitle = serializers.CharField(max_length=5000, allow_blank=True)
    visible = serializers.BooleanField()
    image = serializers.CharField(
        max_length=1000, allow_blank=True, validators=[validate_media_url]
    )
    video = serializers.CharField(
        max_length=1000, allow_blank=True, validators=[validate_media_url]
    )
    color = serializers.RegexField(r"^#[0-9a-fA-F]{6}$")
    background = serializers.RegexField(r"^#[0-9a-fA-F]{6}$")
    font = serializers.ChoiceField(choices=["Open Sans", "Arial", "Georgia"])
    brightness = serializers.IntegerField(min_value=30, max_value=150)
    saturation = serializers.IntegerField(min_value=0, max_value=200)
    items = ItemSerializer(many=True)

    def validate_items(self, value):
        if len(value) > 100 or len({i["id"] for i in value}) != len(value):
            raise serializers.ValidationError("Не более 100 элементов с уникальными ID.")
        return value


class ThemeSerializer(serializers.Serializer):
    accent = serializers.RegexField(r"^#[0-9a-fA-F]{6}$")
    font = serializers.ChoiceField(choices=["Open Sans", "Arial", "Georgia"])


class CompanySerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=50)
    email = serializers.EmailField()
    address = serializers.CharField(max_length=300)
    demo = serializers.BooleanField()


class DocumentSerializer(serializers.Serializer):
    theme = ThemeSerializer()
    company = CompanySerializer()
    sections = SectionSerializer(many=True)

    def validate_sections(self, value):
        if not 1 <= len(value) <= 40:
            raise serializers.ValidationError("От 1 до 40 секций.")
        if len({s["id"] for s in value}) != len(value):
            raise serializers.ValidationError("ID секций должны быть уникальны.")
        return value


class SaveSerializer(serializers.Serializer):
    revision = serializers.IntegerField(min_value=1)
    document = DocumentSerializer()


class LeadSerializer(serializers.ModelSerializer):
    consent = serializers.BooleanField(write_only=True)
    honeypot = serializers.CharField(write_only=True, required=False, allow_blank=True, default="")

    class Meta:
        model = Lead
        fields = [
            "id",
            "name",
            "phone",
            "message",
            "region",
            "consent",
            "consent_version",
            "honeypot",
            "created_at",
            "status",
        ]
        read_only_fields = ["id", "created_at", "status"]

    def validate_phone(self, value):
        if (
            not re.fullmatch(r"[+\d ()-]{10,30}", value)
            or not 10 <= len(re.sub(r"\D", "", value)) <= 15
        ):
            raise serializers.ValidationError("Введите корректный телефон.")
        return value

    def validate_consent(self, value):
        if not value:
            raise serializers.ValidationError("Нужно отдельное согласие на обработку данных.")
        return value

    def validate_consent_version(self, value):
        if value != "2026-10-15":
            raise serializers.ValidationError("Обновите страницу и прочитайте актуальное согласие.")
        return value

    def validate_honeypot(self, value):
        if value:
            raise serializers.ValidationError("Не удалось отправить заявку.")
        return value

    def create(self, validated_data):
        validated_data.pop("consent")
        validated_data.pop("honeypot", None)
        return super().create(validated_data)
