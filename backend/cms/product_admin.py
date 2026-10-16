"""Native catalog forms write through the same revision boundary as the React editor."""

import uuid
from pathlib import Path

from django import forms
from django.conf import settings
from django.contrib import admin
from django.core.exceptions import ValidationError
from django.forms.models import BaseInlineFormSet
from django.utils.html import format_html
from PIL import Image, UnidentifiedImageError
from unfold.admin import ModelAdmin, TabularInline

from .catalog import localized, patch_product
from .models import MediaAsset, Product, ProductImage, SiteContent
from .serializers import ItemSerializer
from .services import update_content


def validate_photo(file):
    if not file:
        return file
    if file.size > settings.MAX_IMAGE_UPLOAD_MB * 1024 * 1024:
        raise ValidationError(
            f"Изображение должно быть не больше {settings.MAX_IMAGE_UPLOAD_MB} МБ."
        )
    try:
        image = Image.open(file)
        if image.format not in {"JPEG", "PNG", "WEBP"} or image.width * image.height > 40_000_000:
            raise ValidationError("Разрешены JPG, PNG и WebP до 40 мегапикселей.")
        image.verify()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise ValidationError("Повреждённое изображение.") from None
    finally:
        file.seek(0)
    return file


def validate_video(file):
    if not file:
        return file
    if file.size > settings.MAX_VIDEO_UPLOAD_MB * 1024 * 1024:
        raise ValidationError(
            f"Видео должно быть не больше {settings.MAX_VIDEO_UPLOAD_MB} МБ."
        )
    suffix = Path(file.name).suffix.lower()
    if suffix not in {".mp4", ".webm"}:
        raise ValidationError("Разрешены MP4 и WebM.")
    header = file.read(32)
    if not (
        (suffix == ".mp4" and header[4:8] == b"ftyp")
        or (suffix == ".webm" and header[:4] == b"\x1aE\xdf\xa3")
    ):
        raise ValidationError("Некорректный видеофайл.")
    file.seek(0)
    return file


def store_photo(file, user):
    suffix = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}[Image.open(file).format]
    file.seek(0)
    original = file.name[:200]
    file.name = uuid.uuid4().hex + suffix
    return MediaAsset.objects.create(
        file=file, kind="image", name=original, uploaded_by=user
    ).file.url


def store_video(file, user):
    suffix = Path(file.name).suffix.lower()
    if suffix not in {".mp4", ".webm"}:
        raise ValidationError("Разрешены MP4 и WebM.")
    file.seek(0)
    original = file.name[:200]
    file.name = uuid.uuid4().hex + suffix
    return MediaAsset.objects.create(
        file=file, kind="video", name=original, uploaded_by=user
    ).file.url


class ProductForm(forms.ModelForm):
    revision = forms.IntegerField(widget=forms.HiddenInput)
    preview_upload = forms.FileField(
        label="Загрузить превью", required=False, validators=[validate_photo]
    )
    section_id = forms.ChoiceField(label="Секция каталога")
    attributes = forms.CharField(
        label="Характеристики",
        required=False,
        widget=forms.Textarea,
        help_text="По одной в строке: название: значение. До 20 характеристик.",
    )
    promo_enabled = forms.BooleanField(label="Показывать промо", required=False)
    promo_label = forms.CharField(label="Название промо", max_length=80, required=False)
    promo_text = forms.CharField(
        label="Описание промо", max_length=1000, required=False, widget=forms.Textarea
    )
    promo_price = forms.DecimalField(
        label="Промо-цена, ₸", max_digits=10, decimal_places=2, min_value=0, required=False
    )
    promo_image = forms.CharField(
        label="Изображение промо (ссылка)", max_length=1000, required=False
    )
    promo_video = forms.CharField(
        label="Видео промо (ссылка)", max_length=1000, required=False
    )
    promo_upload = forms.FileField(
        label="Загрузить изображение промо", required=False, validators=[validate_photo]
    )
    promo_video_upload = forms.FileField(
        label="Загрузить видео промо",
        required=False,
        validators=[validate_video],
    )
    promo_starts_on = forms.DateField(
        label="Начало промо", required=False, widget=forms.DateInput(attrs={"type": "date"})
    )
    promo_ends_on = forms.DateField(
        label="Конец промо", required=False, widget=forms.DateInput(attrs={"type": "date"})
    )

    class Meta:
        model = Product
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.site = SiteContent.objects.get(key="main")
        self.fields["revision"].initial = self.site.revision
        self.fields["preview"].required = False
        self.fields["attributes"].initial = "\n".join(
            f"{row['name']}: {row['value']}" for row in self.instance.attributes or []
        )
        for key, value in (self.instance.promo or {}).items():
            field = self.fields.get("promo_" + key)
            if field:
                field.initial = value
        language = self.data.get("language") or self.instance.language or "ru"
        self.fields["section_id"].choices = [
            (s["id"], s["title"] or s["id"])
            for s in localized(self.site.draft, language).get("sections", [])
            if s["type"] == "catalog"
        ]
        if not self.instance.pk:
            self.fields["code"].initial = "product-" + uuid.uuid4().hex[:12]
        else:
            # Stable document identity avoids deleting an unrelated translation when an SKU changes.
            for key in ("language", "code", "section_id"):
                self.fields[key].disabled = True
        self.fields[
            "preview"
        ].help_text = (
            "Обязательное отдельное изображение: ссылка или загрузка. Не зависит от карусели."
        )

    def clean_attributes(self):
        rows = []
        for line in self.cleaned_data.get("attributes", "").splitlines():
            if not line.strip():
                continue
            name, separator, value = line.partition(":")
            if not separator or not name.strip() or not value.strip():
                raise ValidationError("Формат характеристики: название: значение.")
            rows.append({"name": name.strip(), "value": value.strip()})
        return rows

    def clean(self):
        data = super().clean()
        data["promo"] = {
            "enabled": data.get("promo_enabled", False),
            "label": data.get("promo_label", ""),
            "text": data.get("promo_text", ""),
            "price": data.get("promo_price"),
            "image": data.get("promo_image", ""),
            "video": data.get("promo_video", ""),
            "starts_on": data.get("promo_starts_on"),
            "ends_on": data.get("promo_ends_on"),
        }
        data["promo"] = {
            k: str(v) if v is not None and k in {"price", "starts_on", "ends_on"} else v
            for k, v in data["promo"].items()
        }
        self.site = SiteContent.objects.select_for_update().get(key="main")
        if data.get("revision") != self.site.revision:
            raise ValidationError("Черновик изменён другим редактором. Откройте форму заново.")
        if not data.get("preview") and not data.get("preview_upload"):
            self.add_error("preview", "Укажите превью или загрузите изображение.")
        # Reuse the document contract for nested promotion and attribute rules.
        item = {
            "id": data.get("code", "invalid"),
            "image": data.get("preview") or "/pending.jpg",
            **{
                key: data.get(key, "")
                for key in ("title", "text", "category", "tag", "seo_title", "seo_description")
            },
            "price": data.get("price", 0),
            "attributes": data.get("attributes") or [],
            "promo": data.get("promo") or None,
        }
        validator = ItemSerializer(data=item)
        if not validator.is_valid():

            def messages(value):
                if isinstance(value, dict):
                    return [message for row in value.values() for message in messages(row)]
                if isinstance(value, list):
                    return [message for row in value for message in messages(row)]
                return [str(value)]

            raise ValidationError(messages(validator.errors))
        self.instance.promo = data["promo"]
        section = next(
            (
                s
                for s in localized(self.site.draft, data.get("language", "ru")).get("sections", [])
                if s["id"] == data.get("section_id")
            ),
            None,
        )
        if not self.instance.pk and section and len(section["items"]) >= 100:
            raise ValidationError("В секции допускается не более 100 товаров.")
        return data


class ImageForm(forms.ModelForm):
    upload = forms.FileField(
        label="Загрузить фотографию", required=False, validators=[validate_photo]
    )

    class Meta:
        model = ProductImage
        exclude = ["image_id"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["url"].required = False

    def clean(self):
        data = super().clean()
        if not data.get("DELETE") and not data.get("url") and not data.get("upload"):
            self.add_error("url", "Укажите ссылку или загрузите фотографию.")
        return data


class ImageFormSet(BaseInlineFormSet):
    def clean(self):
        super().clean()
        rows = [
            f.cleaned_data
            for f in self.forms
            if f.cleaned_data and not f.cleaned_data.get("DELETE")
        ]
        if len(rows) > 12:
            raise ValidationError("Не более 12 фотографий карусели.")
        if len({row.get("position") for row in rows}) != len(rows):
            raise ValidationError("Номера фотографий должны быть уникальны.")


class ImageInline(TabularInline):
    model = ProductImage
    form = ImageForm
    formset = ImageFormSet
    fields = ["position", "url", "upload", "alt"]
    extra = 0
    max_num = 12


@admin.register(Product)
class ProductAdmin(ModelAdmin):
    form = ProductForm
    inlines = [ImageInline]
    list_display = ["preview_display", "title", "code", "language", "category", "price"]
    list_display_links = ["title"]
    readonly_fields = ["preview_display"]
    search_fields = ["title", "code", "category"]
    list_filter = ["language", "category"]
    actions = None  # Bulk deletion must not bypass draft revisions.
    fields = [
        "revision",
        "language",
        "section_id",
        "code",
        "title",
        "text",
        "category",
        "price",
        "preview",
        "preview_display",
        "preview_upload",
        "tag",
        "attributes",
        "promo_enabled",
        "promo_label",
        "promo_text",
        "promo_price",
        "promo_starts_on",
        "promo_ends_on",
        "promo_image",
        "promo_upload",
        "seo_title",
        "seo_description",
    ]

    @admin.display(description="Превью")
    def preview_display(self, obj):
        return (
            format_html('<img src="{}" alt="{}" width="80" loading="lazy">', obj.preview, obj.title)
            if obj.preview
            else "Превью не загружено"
        )

    def save_model(self, request, obj, form, change):
        if form.cleaned_data.get("preview_upload"):
            obj.preview = store_photo(form.cleaned_data["preview_upload"], request.user)
        if form.cleaned_data.get("promo_upload"):
            obj.promo["image"] = store_photo(form.cleaned_data["promo_upload"], request.user)
        if form.cleaned_data.get("promo_video_upload"):
            obj.promo["video"] = store_video(form.cleaned_data["promo_video_upload"], request.user)
        super().save_model(request, obj, form, change)

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        for obj in formset.deleted_objects:
            obj.delete()
        for row in instances:
            row.image_id = row.image_id or uuid.uuid4().hex
            image_form = next(f for f in formset.forms if f.instance is row)
            if image_form.cleaned_data.get("upload"):
                row.url = store_photo(image_form.cleaned_data["upload"], request.user)
            row.save()
        formset.save_m2m()

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        update_content(
            expected_revision=form.cleaned_data["revision"],
            editor=request.user,
            document=patch_product(form.site.draft, form.instance),
        )
        self.message_user(
            request, "Товар сохранён в черновик. Опубликуйте изменения в редакторе сайта."
        )

    def delete_model(self, request, obj):
        site = SiteContent.objects.select_for_update().get(key="main")
        document = patch_product(site.draft, obj, delete=True)
        update_content(expected_revision=site.revision, editor=request.user, document=document)

    def has_add_permission(self, request):
        return (
            super().has_add_permission(request) and SiteContent.objects.filter(key="main").exists()
        )
