"""Content aggregate owns draft/public snapshots; enquiries remain separate records."""

from django.conf import settings
from django.db import models
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken


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
