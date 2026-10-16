"""Content aggregate owns draft/public snapshots; enquiries remain separate records."""

from django.conf import settings
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from .validators import validate_media_url


class Product(models.Model):
    """Queryable projection of catalog entries in the site draft, never a second publication."""

    language = models.CharField(
        "Язык", max_length=2, choices=[("ru", "Русский"), ("kk", "Қазақша")], default="ru"
    )
    section_id = models.CharField("Секция каталога", max_length=80)
    code = models.CharField(
        "Артикул",
        max_length=80,
        validators=[
            RegexValidator(
                r"^[a-zA-Z0-9_-]{1,80}$", "Латинские буквы, цифры, дефис и подчёркивание."
            )
        ],
    )
    title = models.CharField("Название", max_length=200)
    text = models.TextField("Описание", max_length=2000)
    category = models.CharField("Категория", max_length=100)
    price = models.DecimalField(
        "Цена, ₸ / шт.", max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]
    )
    preview = models.CharField("Превью (ссылка)", max_length=1000, validators=[validate_media_url])
    tag = models.CharField("Метка", max_length=100, blank=True)
    attributes = models.JSONField("Характеристики", default=list, blank=True)
    promo = models.JSONField("Промо", default=dict, blank=True)
    seo_title = models.CharField("SEO-заголовок", max_length=120, blank=True)
    seo_description = models.CharField("SEO-описание", max_length=320, blank=True)

    class Meta:
        verbose_name = "товар"
        verbose_name_plural = "Продукция"
        constraints = [
            models.UniqueConstraint(
                fields=["language", "code"], name="unique_product_language_code"
            )
        ]

    def __str__(self):
        return self.title


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="images", verbose_name="Товар"
    )
    image_id = models.CharField(max_length=80)
    url = models.CharField("Изображение (ссылка)", max_length=1000, validators=[validate_media_url])
    alt = models.CharField("Описание изображения", max_length=200)
    position = models.PositiveSmallIntegerField("Порядок", default=1)

    class Meta:
        verbose_name = "фотография карусели"
        verbose_name_plural = "Фотографии карусели (отдельно от превью)"
        ordering = ["position", "pk"]


class AnalyticsCounter(models.Model):
    day = models.DateField("Дата")
    path = models.CharField("Страница", max_length=120)
    event = models.CharField("Событие", max_length=20)
    language = models.CharField("Язык", max_length=2)
    count = models.PositiveBigIntegerField("Количество", default=0)

    class Meta:
        verbose_name = "счётчик аналитики"
        verbose_name_plural = "Аналитика"
        constraints = [
            models.UniqueConstraint(
                fields=["day", "path", "event", "language"], name="unique_daily_analytics"
            )
        ]


class SiteContent(models.Model):
    key = models.CharField("Ключ сайта", max_length=40, unique=True, default="main")
    draft = models.JSONField("Черновик", default=dict)
    published = models.JSONField("Опубликованное содержимое", default=dict)
    revision = models.PositiveIntegerField("Редакция", default=1)
    published_revision = models.PositiveIntegerField("Опубликованная редакция", default=0)
    updated_at = models.DateTimeField("Обновлено", auto_now=True)

    class Meta:
        verbose_name = "содержимое сайта"
        verbose_name_plural = "Содержимое сайта"

    def __str__(self):
        return f"Сайт {self.key} · редакция {self.revision}"


class ContentRevision(models.Model):
    site = models.ForeignKey(
        SiteContent, verbose_name="Сайт", on_delete=models.CASCADE, related_name="history"
    )
    number = models.PositiveIntegerField("Номер редакции")
    snapshot = models.JSONField("Снимок содержимого")
    action = models.CharField(
        "Действие", max_length=20, choices=[("save", "Сохранение"), ("publish", "Публикация")]
    )
    editor = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name="Редактор", on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField("Создано", auto_now_add=True)

    class Meta:
        verbose_name = "редакция содержимого"
        verbose_name_plural = "История редакций"
        constraints = [
            models.UniqueConstraint(fields=["site", "number"], name="unique_site_revision")
        ]

    def __str__(self):
        return f"Редакция {self.number} · {self.get_action_display()}"


class MediaAsset(models.Model):
    file = models.FileField("Файл", upload_to="uploads/%Y/%m/")
    kind = models.CharField(
        "Тип файла", max_length=10, choices=[("image", "Изображение"), ("video", "Видео")]
    )
    name = models.CharField("Название файла", max_length=200)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name="Загрузил", on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField("Загружено", auto_now_add=True)

    class Meta:
        verbose_name = "медиафайл"
        verbose_name_plural = "Медиафайлы"

    def __str__(self):
        return self.name


class Lead(models.Model):
    name = models.CharField("Имя", max_length=100)
    phone = models.CharField("Телефон", max_length=30)
    message = models.TextField("Обращение", blank=True, max_length=2000)
    region = models.CharField("Регион", max_length=100, blank=True)
    consent_version = models.CharField("Версия согласия", max_length=40)
    consent_at = models.DateTimeField("Согласие получено", auto_now_add=True)
    status = models.CharField(
        "Статус", max_length=20, default="new", choices=[("new", "Новая"), ("done", "Обработана")]
    )
    created_at = models.DateTimeField("Создано", auto_now_add=True)

    class Meta:
        verbose_name = "заявка"
        verbose_name_plural = "Заявки"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} · {self.phone}"


# Proxies translate third-party admin models without changing their database tables.
class IssuedToken(OutstandingToken):
    class Meta:
        proxy = True
        verbose_name = "выданный токен"
        verbose_name_plural = "Выданные токены"

    def __str__(self):
        return f"Токен №{self.pk} · {self.user or 'пользователь удалён'}"


class RevokedToken(BlacklistedToken):
    class Meta:
        proxy = True
        verbose_name = "отозванный токен"
        verbose_name_plural = "Отозванные токены"

    def __str__(self):
        return f"Отозванный токен №{self.token_id}"
