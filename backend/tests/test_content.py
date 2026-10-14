from copy import deepcopy

import pytest
from cms.models import ContentRevision
from cms.serializers import DocumentSerializer

pytestmark = pytest.mark.django_db


def test_draft_save_does_not_change_public_site(site, editor_api, api, document):
    changed = deepcopy(document)
    changed["sections"][0]["title"] = "Changed heading"
    result = editor_api.put(
        "/api/editor/content/", {"revision": 1, "document": changed}, format="json"
    )
    assert result.status_code == 200
    assert result.data["revision"] == 2
    assert api.get("/api/content/").data["document"] == document
    assert ContentRevision.objects.get(number=2).action == "save"
    publication = editor_api.post("/api/editor/publish/", {"revision": 2}, format="json")
    assert publication.status_code == 200
    assert api.get("/api/content/").data["document"]["sections"][0]["title"] == "Changed heading"
    assert ContentRevision.objects.get(number=3).action == "publish"


def test_stale_editor_cannot_overwrite_changes(site, editor_api, document):
    assert (
        editor_api.put(
            "/api/editor/content/", {"revision": 1, "document": document}, format="json"
        ).status_code
        == 200
    )
    result = editor_api.put(
        "/api/editor/content/", {"revision": 1, "document": document}, format="json"
    )
    assert result.status_code == 409
    assert ContentRevision.objects.count() == 1
    assert (
        editor_api.post("/api/editor/publish/", {"revision": 1}, format="json").status_code == 409
    )
    site.refresh_from_db()
    assert site.published_revision == 1


@pytest.mark.parametrize(
    "url,method",
    [
        ("/api/editor/content/", "get"),
        ("/api/editor/publish/", "post"),
        ("/api/editor/leads/", "get"),
        ("/api/editor/media/", "post"),
    ],
)
def test_anonymous_cannot_access_editor(site, api, url, method):
    assert getattr(api, method)(url).status_code == 401


def test_non_staff_cannot_edit(site, api, django_user_model):
    user = django_user_model.objects.create_user("visitor", password="TestOnly-Password-42!")
    api.force_authenticate(user)
    assert api.get("/api/editor/content/").status_code == 403


@pytest.mark.parametrize(
    "field,value",
    [
        ("image", "javascript:alert(1)"),
        ("video", "//evil.example/video.mp4"),
        ("background", "red;position:fixed"),
        ("font", "malicious font"),
        ("brightness", 151),
    ],
)
def test_unsafe_document_rejected(document, field, value):
    document["sections"][0][field] = value
    assert not DocumentSerializer(data=document).is_valid()


def test_duplicate_section_ids_rejected(document):
    document["sections"][1]["id"] = document["sections"][0]["id"]
    assert not DocumentSerializer(data=document).is_valid()


def test_invalid_document_does_not_create_revision(site, editor_api, document):
    document["sections"][0]["brightness"] = -100
    assert (
        editor_api.put(
            "/api/editor/content/", {"revision": 1, "document": document}, format="json"
        ).status_code
        == 400
    )
    site.refresh_from_db()
    assert site.revision == 1
    assert not ContentRevision.objects.exists()


def test_seed_command_preserves_edits(site, document):
    from django.core.management import call_command

    site.draft = {"custom": "editor work"}
    site.save()
    call_command("seed_content")
    site.refresh_from_db()
    assert site.draft == {"custom": "editor work"}
