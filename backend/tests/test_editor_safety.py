from copy import deepcopy
from unittest.mock import patch

import pytest
from cms.admin import LeadAdminForm
from cms.models import ContentRevision, MediaAsset
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, OperationalError

pytestmark = pytest.mark.django_db


def test_localized_content_roundtrip_and_publication(site, editor_api, api, document):
    changed = deepcopy(document)
    changed["translations"] = {
        "kk": {"company": deepcopy(document["company"]), "sections": deepcopy(document["sections"])}
    }
    changed["translations"]["kk"]["sections"][0]["title"] = "Кірпіш зауыты"
    response = editor_api.put(
        "/api/editor/content/", {"revision": 1, "document": changed}, format="json"
    )
    assert response.status_code == 200
    assert response.data["document"]["sections"][0]["title"] == document["sections"][0]["title"]
    assert "translations" not in api.get("/api/content/").data["document"]
    assert (
        editor_api.post("/api/editor/publish/", {"revision": 2}, format="json").status_code == 200
    )
    assert (
        api.get("/api/content/").data["document"]["translations"]["kk"]["sections"][0]["title"]
        == "Кірпіш зауыты"
    )


@pytest.mark.parametrize("language", ["en", "kz"])
def test_unknown_translation_language_rejected(site, editor_api, document, language):
    document["translations"] = {language: {}}
    assert (
        editor_api.put(
            "/api/editor/content/", {"revision": 1, "document": document}, format="json"
        ).status_code
        == 400
    )
    assert not ContentRevision.objects.exists()


def test_duplicate_ids_in_translation_rejected(site, editor_api, document):
    document["translations"] = {
        "kk": {"company": deepcopy(document["company"]), "sections": deepcopy(document["sections"])}
    }
    document["translations"]["kk"]["sections"][1]["id"] = document["translations"]["kk"][
        "sections"
    ][0]["id"]
    response = editor_api.put(
        "/api/editor/content/", {"revision": 1, "document": document}, format="json"
    )
    assert response.status_code == 400 and "translations" in response.data["document"]


@pytest.mark.parametrize(
    "field,value", [("name", "   "), ("email", "bad"), ("phone", "123"), ("address", "")]
)
def test_invalid_company_rejected_before_persistence(site, editor_api, document, field, value):
    document["company"][field] = value
    response = editor_api.put(
        "/api/editor/content/", {"revision": 1, "document": document}, format="json"
    )
    assert response.status_code == 400
    site.refresh_from_db()
    assert site.revision == 1 and not ContentRevision.objects.exists()


def test_unique_race_rolls_back_content_and_returns_conflict(site, editor_api, document):
    with patch(
        "cms.services.ContentRevision.objects.create", side_effect=IntegrityError("PRIVATE SQL")
    ):
        response = editor_api.put(
            "/api/editor/content/", {"revision": 1, "document": document}, format="json"
        )
    assert response.status_code == 409 and "PRIVATE SQL" not in str(response.data)
    site.refresh_from_db()
    assert site.revision == 1


def test_database_outage_returns_retryable_error(site, editor_api, document):
    with patch("cms.views.update_content", side_effect=OperationalError("PRIVATE CONNECTION")):
        response = editor_api.put(
            "/api/editor/content/", {"revision": 1, "document": document}, format="json"
        )
    assert response.status_code == 503 and response["Retry-After"] == "5"
    assert "PRIVATE CONNECTION" not in str(response.data)


@pytest.mark.parametrize(
    "extension,limit", [("png", "MAX_IMAGE_UPLOAD_MB"), ("webm", "MAX_VIDEO_UPLOAD_MB")]
)
def test_configurable_upload_limits(editor_api, api, settings, extension, limit):
    setattr(settings, limit, 1)
    config = api.get("/api/config/")
    key = "image_mb" if extension == "png" else "video_mb"
    assert config.data["upload_limits"][key] == 1
    upload = SimpleUploadedFile("large." + extension, b"x" * (1024 * 1024 + 1))
    response = editor_api.post("/api/editor/media/", {"file": upload}, format="multipart")
    assert response.status_code == 400 and "1 МБ" in str(response.data)
    assert not MediaAsset.objects.exists()


def test_branded_admin_login(client):
    response = client.get("/django-admin/login/")
    assert response.status_code == 200
    assert b"TerraKlink Admin" in response.content
    assert b"unfold/css/styles.css" in response.content


def test_admin_lead_phone_validation():
    form = LeadAdminForm(
        data={"name": "Test", "phone": "wrong", "region": "", "message": "", "status": "new"}
    )
    assert not form.is_valid() and "phone" in form.errors


def test_admin_duplicate_username_shows_field_error(client, django_user_model):
    user = django_user_model.objects.create_superuser("existing", password="TestOnly-Password-42!")
    client.force_login(user)
    response = client.post(
        "/django-admin/auth/user/add/",
        {
            "username": "existing",
            "password1": "Another-Test-Password-42!",
            "password2": "Another-Test-Password-42!",
            "usable_password": "true",
        },
    )
    assert response.status_code == 200
    assert "username" in response.context["adminform"].form.errors
    assert django_user_model.objects.filter(username="existing").count() == 1
