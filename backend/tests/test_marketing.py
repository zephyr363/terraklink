import json
import re
from copy import deepcopy
from xml.etree import ElementTree

import pytest
from cms.marketing import active_promo, gallery, products
from cms.models import IssuedToken, RevokedToken
from cms.seo_serializers import SeoSerializer
from cms.serializers import DocumentSerializer
from django.contrib import admin
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

pytestmark = pytest.mark.django_db


def configure(site, document):
    document["company"]["demo"] = False
    document["seo"] = {
        "site_url": "https://brand.example",
        "indexing": True,
        "title": "Кирпич TerraKlink",
        "description": "Продукция в Казахстане",
        "city": "Алматы",
        "region": "Алматы",
        "latitude": 43.24,
        "longitude": 76.92,
        "areas_served": ["Казахстан"],
        "ai_summary": "Кирпич для архитектурных проектов.",
        "faq": [{"question": "Где купить?", "answer": "Обратитесь в отдел продаж."}],
    }
    site.published = document
    site.save()


def test_initial_html_and_discovery_use_only_published_content(site, document, client):
    configure(site, document)
    site.draft = deepcopy(document)
    site.draft["seo"]["title"] = "СЕКРЕТНЫЙ ЧЕРНОВИК"
    site.save()
    response = client.get("/")
    html = response.content.decode()
    assert response.status_code == 200
    assert response["X-Robots-Tag"] == "index, follow"
    assert "<title>Кирпич TerraKlink</title>" in html
    assert "СЕКРЕТНЫЙ" not in html
    assert '<link rel="canonical" href="https://brand.example/">' in html
    assert "Где купить?" in html and "Обратитесь в отдел продаж." in html
    assert "/assets/app.js" in html and "/assets/app.css" in html
    data = client.get("/api/seo/").json()
    business = next(n for n in data["structured_data"]["@graph"] if n["@type"] == "LocalBusiness")
    assert business["address"]["addressCountry"] == "KZ"
    assert business["geo"]["latitude"] == 43.24
    assert (
        "Sitemap: https://brand.example/sitemap.xml" in client.get("/robots.txt").content.decode()
    )
    assert document["seo"]["ai_summary"] in client.get("/llms.txt").content.decode()
    assert "СЕКРЕТНЫЙ" not in client.get("/llms.txt").content.decode()


def test_product_html_schema_gallery_and_locale_sitemap(site, document, client):
    configure(site, document)
    item = products(document)[0]
    item.update(
        images=[
            {"id": "first", "url": "/media/cover.jpg", "alt": "Обложка"},
            {"id": "second", "url": "/media/side.jpg", "alt": "Сбоку"},
        ],
        price="100.00",
        promo={"enabled": True, "label": "Промо", "text": "Выгодное предложение", "price": "80.00"},
        seo_title="Особый кирпич",
        seo_description="Описание особого кирпича",
    )
    translation = deepcopy({key: document[key] for key in ("company", "sections", "seo")})
    translated_item = products(translation)[0]
    translated_item.update(id="kazakh-product", seo_title="Кірпіш", title="Қазақша кірпіш")
    document["translations"] = {"kk": translation}
    site.published = document
    site.save()
    path = "/catalog/" + item["id"]
    response = client.get(path)
    html = response.content.decode()
    assert response.status_code == 200
    assert "Особый кирпич" in html and "Выгодное предложение" in html and "80.00" in html
    schema = json.loads(re.search(r'type="application/ld\+json">(.*?)</script>', html).group(1))
    node = next(n for n in schema["@graph"] if n["@type"] == "Product")
    assert node["offers"]["price"] == "80.00"
    assert node["image"] == [
        "https://brand.example/media/cover.jpg",
        "https://brand.example/media/side.jpg",
    ]
    assert client.get("/catalog/kazakh-product?lang=kk").status_code == 200
    assert client.get("/catalog/kazakh-product").status_code == 404
    root = ElementTree.fromstring(client.get("/sitemap.xml").content)
    urls = [loc.text for loc in root.iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
    assert "https://brand.example/catalog/kazakh-product?lang=kk" in urls
    assert "https://brand.example/catalog/kazakh-product" not in urls
    assert "https://brand.example" + path in urls


def test_demo_opt_out_hidden_product_and_not_found(site, document, client):
    configure(site, document)
    document["company"]["demo"] = True
    site.published = document
    site.save()
    assert "noindex" in client.get("/")["X-Robots-Tag"]
    assert "Disallow: /\n" in client.get("/robots.txt").content.decode()
    assert "<url>" not in client.get("/sitemap.xml").content.decode()
    assert document["seo"]["ai_summary"] not in client.get("/llms.txt").content.decode()
    item = products(document)[0]
    for section in document["sections"]:
        if section["type"] == "catalog":
            section["visible"] = False
    site.published = document
    site.save()
    assert client.get("/catalog/" + item["id"]).status_code == 404
    for path in ("/missing", "/legal/missing", "/api/not-a-route"):
        assert client.get(path).status_code == 404
    assert client.get("/legal/cookies").status_code == 200
    assert client.get("/api/seo/?path=https://evil.example").status_code == 400
    assert client.post("/api/seo/").status_code == 405


def test_json_ld_cannot_terminate_script(site, document, client):
    configure(site, document)
    document["company"]["name"] = '</script><script>alert("x")</script>'
    document["seo"]["structured_data"] = True
    site.published = document
    site.save()
    html = client.get("/").content.decode()
    assert "<script>alert(" not in html
    assert r"\u003c/script\u003e" in html
    document["seo"]["structured_data"] = False
    document["seo"]["ai_enabled"] = False
    site.published = document
    site.save()
    assert client.get("/api/seo/").json()["structured_data"]["@graph"] == []
    assert document["seo"]["ai_summary"] not in client.get("/llms.txt").content.decode()


@pytest.mark.parametrize(
    "values",
    [
        {"site_url": "http://brand.example"},
        {"site_url": "https://brand.example/path"},
        {"site_url": "https://["},
        {"site_url": "https://user:pass@brand.example"},
        {"site_url": "https://brand.example:wrong"},
        {"og_image": "javascript:alert(1)"},
        {"same_as": ["http://brand.example"]},
        {"latitude": float("nan"), "longitude": 20},
        {"latitude": 10},
        {"latitude": 91, "longitude": 20},
        {"pages": {"/missing": {"title": "test"}}},
        {"faq": [{"question": "", "answer": "test"}]},
        {"google_verification": "<script>"},
    ],
)
def test_invalid_seo_rejected(values):
    assert not SeoSerializer(data=values).is_valid()


def test_gallery_crud_promo_round_trip_without_legacy_data_loss(site, document, editor_api):
    item = products(document)[0]
    images = [
        {"id": "a", "url": "/media/a.jpg", "alt": "Первое"},
        {"id": "b", "url": "/media/b.jpg", "alt": "Второе"},
    ]
    item["images"] = images
    item["promo"] = {
        "enabled": True,
        "label": "Акция",
        "text": "Описание",
        "price": "1.00",
        "starts_on": "2026-01-01",
        "ends_on": "2026-12-31",
    }
    response = editor_api.put(
        "/api/editor/content/", {"revision": 1, "document": document}, format="json"
    )
    assert response.status_code == 200, response.data
    saved = response.data["document"]
    saved_item = products(saved)[0]
    assert saved_item["image"] == products(document)[0]["image"]
    saved_item["images"] = list(reversed(images))
    saved_item["images"][0]["alt"] = "Изменено"
    saved_item["promo"] = None
    response = editor_api.put(
        "/api/editor/content/", {"revision": 2, "document": saved}, format="json"
    )
    assert response.status_code == 200
    assert products(response.data["document"])[0]["image"] == products(document)[0]["image"]
    saved = response.data["document"]
    products(saved)[0]["images"] = []
    response = editor_api.put(
        "/api/editor/content/", {"revision": 3, "document": saved}, format="json"
    )
    assert response.status_code == 200
    assert products(response.data["document"])[0]["image"] == products(document)[0]["image"]
    assert gallery(products(response.data["document"])[0]) == []


@pytest.mark.parametrize(
    "patch",
    [
        {"images": [{"id": "a", "url": "/a.jpg", "alt": ""}] * 2},
        {"images": [{"id": str(i), "url": "/a.jpg", "alt": ""} for i in range(13)]},
        {"images": [{"id": "a", "url": "", "alt": ""}]},
        {"images": [{"id": "a", "url": "javascript:alert(1)", "alt": ""}]},
        {"promo": {"enabled": True, "label": "", "text": "", "price": None}},
        {"promo": {"enabled": True, "label": "test", "text": "", "price": "999999.00"}},
        {
            "promo": {
                "enabled": True,
                "label": "test",
                "text": "",
                "price": None,
                "starts_on": "2026-02-01",
                "ends_on": "2026-01-01",
            }
        },
    ],
)
def test_invalid_product_rejected(document, patch):
    products(document)[0].update(patch)
    assert not DocumentSerializer(data=document).is_valid()


def test_promotion_dates_inclusive_and_legacy_gallery(document):
    item = products(document)[0]
    assert gallery(item)[0]["url"] == item["image"]
    item["promo"] = {"enabled": True, "starts_on": "2026-10-01", "ends_on": "2026-10-15"}
    assert active_promo(item, "2026-10-01")
    assert active_promo(item, "2026-10-15")
    assert active_promo(item, "2026-10-16") is None
    assert active_promo(item, "2026-09-30") is None
    item["promo"]["enabled"] = False
    assert active_promo(item, "2026-10-10") is None


def test_admin_models_and_tokens_are_russian_and_revocation_is_preserved(client, django_user_model):
    user = django_user_model.objects.create_superuser(
        "admin-test", password="TestOnly-Password-42!"
    )
    client.force_login(user)
    html = client.get("/django-admin/").content.decode()
    for label in (
        "Управление сайтом",
        "Медиафайлы",
        "История редакций",
        "Содержимое сайта",
        "Заявки",
        "Выданные токены",
        "Отозванные токены",
    ):
        assert label in html
    assert "Outstanding tokens" not in html and "Blacklisted tokens" not in html
    assert not admin.site.is_registered(OutstandingToken)
    assert not admin.site.is_registered(BlacklistedToken)
    assert IssuedToken._meta.proxy and RevokedToken._meta.proxy
    token = OutstandingToken.objects.create(
        user=user, jti="test-jti", token="test-only-token", expires_at="2030-01-01T00:00:00Z"
    )
    result = client.post(
        "/django-admin/cms/issuedtoken/", {"action": "revoke", "_selected_action": [token.pk]}
    )
    assert result.status_code == 302
    assert BlacklistedToken.objects.filter(token=token).exists()
    assert (
        "Выдан" in client.get(f"/django-admin/cms/issuedtoken/{token.pk}/change/").content.decode()
    )
