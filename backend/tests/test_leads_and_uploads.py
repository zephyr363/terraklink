import io

import pytest
from cms.models import Lead, MediaAsset
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

pytestmark = pytest.mark.django_db


def payload(**overrides):
    return {
        "name": "Test",
        "phone": "+7 (701) 123-45-67",
        "message": "Request",
        "region": "Алматы",
        "consent": True,
        "consent_version": "2026-10-16",
        "honeypot": "",
        **overrides,
    }


def test_lead_records_consent_and_only_returns_receipt(api):
    result = api.post("/api/leads/", payload(), format="json")
    assert result.status_code == 201
    assert set(result.data) == {"id", "detail"}
    lead = Lead.objects.get()
    assert lead.consent_at and lead.consent_version == "2026-10-16"
    assert api.get("/api/editor/leads/").status_code == 401


@pytest.mark.parametrize(
    "overrides",
    [{"consent": False}, {"consent_version": "old"}, {"phone": "123"}, {"honeypot": "spam"}],
)
def test_invalid_consent_or_lead_is_not_stored(api, overrides):
    assert api.post("/api/leads/", payload(**overrides), format="json").status_code == 400
    assert not Lead.objects.exists()


def test_lead_rate_limited(api):
    for _ in range(10):
        assert api.post("/api/leads/", payload(), format="json").status_code == 201
    assert api.post("/api/leads/", payload(), format="json").status_code == 429


def test_valid_image_stored_with_generated_name(editor_api, tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    output = io.BytesIO()
    Image.new("RGB", (10, 10), "orange").save(output, format="PNG")
    upload = SimpleUploadedFile("../../example.png", output.getvalue(), content_type="image/png")
    result = editor_api.post("/api/editor/media/", {"file": upload}, format="multipart")
    assert result.status_code == 201
    asset = MediaAsset.objects.get()
    assert "example" not in asset.file.name and ".." not in asset.file.name
    assert result.data["kind"] == "image"
    assert (tmp_path / asset.file.name).is_file()


@pytest.mark.parametrize(
    "name,data",
    [
        ("fake.png", b"<script>evil</script>"),
        ("script.svg", b"<svg/>"),
        ("fake.mp4", b"not a video"),
    ],
)
def test_disguised_uploads_rejected(editor_api, name, data):
    upload = SimpleUploadedFile(name, data)
    assert (
        editor_api.post("/api/editor/media/", {"file": upload}, format="multipart").status_code
        == 400
    )
    assert not MediaAsset.objects.exists()
