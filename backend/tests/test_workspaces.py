from copy import deepcopy

import pytest
from cms.models import AnalyticsCounter, Lead

pytestmark = pytest.mark.django_db


def event(**patch):
    return {
        "event": "page_view",
        "path": "/catalog",
        "language": "ru",
        "consent": True,
        "consent_version": "2026-10-16",
        **patch,
    }


@pytest.mark.parametrize("path", ["analytics/", "history/", "library/"])
def test_workspace_requires_staff(api, path):
    assert api.get(f"/api/editor/{path}").status_code == 401


def test_analytics_aggregates_without_identifiers(api, editor_api):
    for _ in range(3):
        assert api.post("/api/analytics/events/", event(), format="json").status_code == 204
    assert AnalyticsCounter.objects.count() == 1
    assert AnalyticsCounter.objects.get().count == 3
    report = editor_api.get("/api/editor/analytics/?days=7")
    assert report.status_code == 200
    assert report.data["counters"][0]["count"] == 3
    assert set(report.data["counters"][0]) == {"day", "path", "event", "language", "count"}
    assert report["Cache-Control"] == "no-store"
    assert report.data["totals"] == [{"event": "page_view", "count": 3}]


@pytest.mark.parametrize(
    "patch",
    [
        {"consent": False},
        {"consent_version": "old"},
        {"path": "/admin"},
        {"path": "/catalog?phone=123"},
        {"event": "arbitrary"},
        {"language": "en"},
    ],
)
def test_invalid_analytics_rejected(api, patch):
    assert api.post("/api/analytics/events/", event(**patch), format="json").status_code == 400
    assert AnalyticsCounter.objects.count() == 0


def test_restore_creates_draft_and_rejects_stale_revision(site, document, editor_api):
    changed = deepcopy(document)
    changed["sections"][0]["title"] = "Первая версия"
    assert (
        editor_api.put(
            "/api/editor/content/", {"document": changed, "revision": 1}, format="json"
        ).status_code
        == 200
    )
    assert (
        editor_api.put(
            "/api/editor/content/", {"document": document, "revision": 2}, format="json"
        ).status_code
        == 200
    )
    result = editor_api.post("/api/editor/restore/", {"number": 2, "revision": 3}, format="json")
    assert result.status_code == 200
    site.refresh_from_db()
    assert site.draft["sections"][0]["title"] == "Первая версия"
    assert site.published == document
    assert site.revision == 4
    assert (
        editor_api.post(
            "/api/editor/restore/", {"number": 2, "revision": 3}, format="json"
        ).status_code
        == 409
    )
    assert editor_api.get("/api/editor/history/").data[0]["number"] == 4


def test_lead_status_validation(editor_api):
    lead = Lead.objects.create(name="Test", phone="+77000000000", consent_version="test")
    url = f"/api/editor/leads/{lead.pk}/"
    assert editor_api.patch(url, {"status": "invalid"}, format="json").status_code == 400
    assert editor_api.patch(url, {"status": "done"}, format="json").status_code == 200
    lead.refresh_from_db()
    assert lead.status == "done"


def test_banner_and_product_extensions_round_trip(site, document, editor_api):
    hero = next(section for section in document["sections"] if section["type"] == "hero")
    hero["banner"] = {"template": "split", "animation": "zoom"}
    item = next(section for section in document["sections"] if section["type"] == "catalog")[
        "items"
    ][0]
    item["attributes"] = [{"name": "Марка", "value": "М150"}]
    item["promo"] = {
        "enabled": True,
        "label": "Акция",
        "text": "",
        "price": None,
        "image": "/assets/promo.webp",
    }
    response = editor_api.put(
        "/api/editor/content/", {"document": document, "revision": 1}, format="json"
    )
    assert response.status_code == 200
    saved = response.data["document"]
    assert next(s for s in saved["sections"] if s["type"] == "hero")["banner"] == hero["banner"]
    saved_item = next(s for s in saved["sections"] if s["type"] == "catalog")["items"][0]
    assert saved_item["promo"]["image"] == "/assets/promo.webp"
    assert saved_item["attributes"] == item["attributes"]


@pytest.mark.parametrize(
    "banner",
    [
        {"template": "script", "animation": "fade"},
        {"template": "image", "animation": "spin"},
        {"template": "video", "animation": "none"},
    ],
)
def test_invalid_banner_rejected(document, banner):
    from cms.serializers import DocumentSerializer

    document["sections"][0]["banner"] = banner
    document["sections"][0]["video"] = ""
    assert not DocumentSerializer(data=document).is_valid()


def test_non_staff_cannot_use_management(api, django_user_model):
    user = django_user_model.objects.create_user("customer", password="TestOnly-Password-42!")
    api.force_authenticate(user)
    assert api.get("/api/editor/history/").status_code == 403
    assert api.get("/api/editor/analytics/").status_code == 403
    assert api.post("/api/editor/restore/", {}, format="json").status_code == 403


@pytest.mark.parametrize("days", [0, 91, "invalid"])
def test_analytics_period_validation(editor_api, days):
    assert editor_api.get(f"/api/editor/analytics/?days={days}").status_code == 400


def test_duplicate_attributes_rejected(document):
    from cms.serializers import DocumentSerializer

    document["sections"][0]["items"][0]["attributes"] = [
        {"name": "Марка", "value": "М150"},
        {"name": "марка", "value": "М200"},
    ]
    assert not DocumentSerializer(data=document).is_valid()
