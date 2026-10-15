import json
from pathlib import Path

import pytest
from cms.models import SiteContent
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient


@pytest.fixture(autouse=True)
def reset_throttle_cache():
    cache.clear()


@pytest.fixture(autouse=True)
def isolated_media_storage(settings, tmp_path):
    # Tests must never inherit a real S3 bucket from the surrounding Compose environment.
    settings.MEDIA_ROOT = tmp_path
    settings.STORAGES = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    }


@pytest.fixture
def document():
    return json.loads(
        (Path(__file__).resolve().parents[1] / "cms/seed.json").read_text(encoding="utf-8")
    )


@pytest.fixture
def site(document):
    return SiteContent.objects.create(
        key="main", draft=document, published=document, published_revision=1
    )


@pytest.fixture
def editor(db):
    return get_user_model().objects.create_user(
        "editor", password="TestOnly-Password-42!", is_staff=True
    )


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def editor_api(editor):
    client = APIClient()
    client.force_authenticate(editor)
    return client
