"""Content aggregate owns draft/public snapshots; enquiries remain separate records."""

from django.conf import settings
from django.db import models


class SiteContent(models.Model):
    key = models.CharField(max_length=40, unique=True, default="main")
    draft = models.JSONField(default=dict)
    published = models.JSONField(default=dict)
    revision = models.PositiveIntegerField(default=1)
    published_revision = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)


class ContentRevision(models.Model):
    site = models.ForeignKey(SiteContent, on_delete=models.CASCADE, related_name="history")
    number = models.PositiveIntegerField()
    snapshot = models.JSONField()
    action = models.CharField(max_length=20)
    editor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["site", "number"], name="unique_site_revision")
        ]


class MediaAsset(models.Model):
    file = models.FileField(upload_to="uploads/%Y/%m/")
    kind = models.CharField(max_length=10)
    name = models.CharField(max_length=200)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Lead(models.Model):
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=30)
    message = models.TextField(blank=True, max_length=2000)
    region = models.CharField(max_length=100, blank=True)
    consent_version = models.CharField(max_length=40)
    consent_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20, default="new", choices=[("new", "Новая"), ("done", "Обработана")]
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
