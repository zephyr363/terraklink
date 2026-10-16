"""Validate the editor document before it crosses the persistence boundary."""

import re

from rest_framework import serializers

from .consent import CONSENT_VERSION
from .models import Lead
from .seo_serializers import SeoSerializer
from .validators import validate_media_url, validate_phone


class ProductImageSerializer(serializers.Serializer):
    id = serializers.RegexField(r"^[a-zA-Z0-9_-]{1,80}$")
    url = serializers.CharField(max_length=1000, validators=[validate_media_url])
    alt = serializers.CharField(max_length=200, allow_blank=True)


class PromoSerializer(serializers.Serializer):
    image = serializers.CharField(
        max_length=1000, allow_blank=True, required=False, validators=[validate_media_url]
    )
    video = serializers.CharField(
        max_length=1000, allow_blank=True, required=False, validators=[validate_media_url]
    )
    enabled = serializers.BooleanField()
    label = serializers.CharField(max_length=80, allow_blank=True)
    text = serializers.CharField(max_length=1000, allow_blank=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, allow_null=True)
    starts_on = serializers.DateField(required=False, allow_null=True)
    ends_on = serializers.DateField(required=False, allow_null=True)

    def validate(self, attrs):
        if (
            attrs.get("starts_on")
            and attrs.get("ends_on")
            and attrs["ends_on"] < attrs["starts_on"]
        ):
            raise serializers.ValidationError("Конец акции не может быть раньше начала.")
        if attrs["enabled"] and not attrs["label"].strip():
            raise serializers.ValidationError({"label": "Укажите название промо."})
        if attrs.get("video") and not attrs.get("label", "").strip():
            raise serializers.ValidationError({"label": "Укажите название промо для видео."})
        return attrs


class AttributeSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=80)
    value = serializers.CharField(max_length=200)


class ItemSerializer(serializers.Serializer):
    attributes = AttributeSerializer(many=True, required=False)
    id = serializers.RegexField(r"^[a-zA-Z0-9_-]{1,80}$")
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
    images = ProductImageSerializer(many=True, required=False)
    promo = PromoSerializer(required=False, allow_null=True)
    seo_title = serializers.CharField(max_length=120, allow_blank=True, required=False)
    seo_description = serializers.CharField(max_length=320, allow_blank=True, required=False)

    def validate(self, attrs):
        attributes = attrs.get("attributes", [])
        if len(attributes) > 20 or len({row["name"].casefold() for row in attributes}) != len(
            attributes
        ):
            raise serializers.ValidationError(
                {"attributes": "Не более 20 характеристик с уникальными названиями."}
            )
        images = attrs.get("images", [])
        if len(images) > 12 or len({image["id"] for image in images}) != len(images):
            raise serializers.ValidationError(
                {"images": "Не более 12 фотографий с уникальными ID."}
            )
        promo = attrs.get("promo")
        if promo and promo.get("price") is not None and promo["price"] > attrs.get("price", 0):
            raise serializers.ValidationError(
                {"promo": "Промо-цена не может превышать обычную цену."}
            )
        if "images" in attrs and not attrs.get("image"):
            attrs["image"] = images[0]["url"] if images else ""
        return attrs


class BannerSerializer(serializers.Serializer):
    template = serializers.ChoiceField(choices=["image", "overlay", "split", "video"])
    animation = serializers.ChoiceField(choices=["none", "fade", "slide", "zoom"])


class SectionSerializer(serializers.Serializer):
    banner = BannerSerializer(required=False)
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

    def validate(self, attrs):
        if attrs.get("banner", {}).get("template") == "video" and not attrs["video"]:
            raise serializers.ValidationError(
                {"video": "Для видеобаннера загрузите видео или укажите ссылку."}
            )
        return attrs


class ThemeSerializer(serializers.Serializer):
    accent = serializers.RegexField(r"^#[0-9a-fA-F]{6}$")
    font = serializers.ChoiceField(choices=["Open Sans", "Arial", "Georgia"])


class CompanySerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=50, validators=[validate_phone])
    email = serializers.EmailField()
    address = serializers.CharField(max_length=300)
    demo = serializers.BooleanField()


class LocalizedContentSerializer(serializers.Serializer):
    company = CompanySerializer()
    sections = SectionSerializer(many=True)
    seo = SeoSerializer(required=False)

    def validate_sections(self, value):
        if not 1 <= len(value) <= 40:
            raise serializers.ValidationError("От 1 до 40 секций.")
        if len({s["id"] for s in value}) != len(value):
            raise serializers.ValidationError("ID секций должны быть уникальны.")
        product_ids = [
            item["id"]
            for section in value
            if section["type"] == "catalog"
            for item in section["items"]
        ]
        if len(set(product_ids)) != len(product_ids):
            raise serializers.ValidationError(
                "ID товаров должны быть уникальны во всех секциях каталога."
            )
        return value


class TranslationsSerializer(serializers.Serializer):
    kk = LocalizedContentSerializer(required=False)

    def to_internal_value(self, data):
        if not isinstance(data, dict) or set(data) - {"kk"}:
            raise serializers.ValidationError("Поддерживается перевод kk; русский — основной язык.")
        return super().to_internal_value(data)


class DocumentSerializer(LocalizedContentSerializer):
    theme = ThemeSerializer()
    translations = TranslationsSerializer(required=False)


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
        if value != CONSENT_VERSION:
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
