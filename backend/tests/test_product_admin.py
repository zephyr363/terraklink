import io
import json

import pytest
from cms.catalog import sync_products
from cms.models import ContentRevision, Product
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

pytestmark = pytest.mark.django_db


@pytest.fixture
def owner_client(client, site):
    owner = get_user_model().objects.create_superuser(
        "catalog-owner", password="TestOnly-Owner-42!"
    )
    client.force_login(owner)
    sync_products(site.draft)
    return client


def payload(site, **changes):
    section = next(s for s in site.draft["sections"] if s["type"] == "catalog")
    return {
        "revision": site.revision,
        "language": "ru",
        "section_id": section["id"],
        "code": "native-product",
        "title": "Новый кирпич",
        "text": "Полное описание",
        "category": "Облицовочный кирпич",
        "price": "500",
        "preview": "/assets/preview.jpg",
        "attributes": "",
        "promo": "{}",
        "images-TOTAL_FORMS": "0",
        "images-INITIAL_FORMS": "0",
        **changes,
    }


def test_product_create_update_delete_only_changes_draft(owner_client, site):
    response = owner_client.post("/django-admin/cms/product/add/", payload(site))
    assert response.status_code == 302
    product = Product.objects.get(code="native-product")
    site.refresh_from_db()
    assert site.revision == 2 and site.published_revision == 1
    assert "native-product" not in json.dumps(site.published)
    assert "native-product" in json.dumps(site.draft)
    response = owner_client.post(
        f"/django-admin/cms/product/{product.pk}/change/", payload(site, title="Другое название")
    )
    assert response.status_code == 302
    product.refresh_from_db()
    assert product.title == "Другое название"
    assert ContentRevision.objects.count() == 2
    response = owner_client.post(f"/django-admin/cms/product/{product.pk}/delete/", {"post": "yes"})
    assert response.status_code == 302
    assert not Product.objects.filter(code="native-product").exists()
    site.refresh_from_db()
    assert "native-product" not in json.dumps(site.draft)
    assert site.published_revision == 1


@pytest.mark.parametrize(
    "changes, error",
    [
        ({"preview": ""}, "Укажите превью"),
        ({"title": ""}, "Обязательное поле"),
        ({"price": "-1"}, "0"),
        ({"revision": "0"}, "Черновик изменён"),
        ({"preview": "javascript:bad"}, "HTTPS"),
    ],
)
def test_invalid_product_has_no_partial_writes(owner_client, site, changes, error):
    response = owner_client.post("/django-admin/cms/product/add/", payload(site, **changes))
    assert response.status_code == 200
    assert error in response.content.decode()
    assert not Product.objects.filter(code="native-product").exists()
    assert not ContentRevision.objects.exists()


def test_duplicate_sku_returns_form_error(owner_client, site):
    existing = Product.objects.filter(language="ru").first()
    response = owner_client.post(
        "/django-admin/cms/product/add/", payload(site, code=existing.code)
    )
    assert response.status_code == 200
    assert response.context["adminform"].form.errors
    assert not ContentRevision.objects.exists()


def photo():
    stream = io.BytesIO()
    Image.new("RGB", (10, 10)).save(stream, "PNG")
    return SimpleUploadedFile("test-only.png", stream.getvalue(), "image/png")


def test_preview_upload_is_independent_of_inline_gallery(owner_client, site):
    response = owner_client.post(
        "/django-admin/cms/product/add/",
        payload(
            site,
            preview="",
            preview_upload=photo(),
            **{
                "images-TOTAL_FORMS": "1",
                "images-0-position": "1",
                "images-0-upload": photo(),
                "images-0-alt": "Вид сбоку",
                "images-0-url": "",
            },
        ),
    )
    assert response.status_code == 302
    product = Product.objects.get(code="native-product")
    assert product.images.count() == 1
    assert product.preview != product.images.get().url
    site.refresh_from_db()
    item = next(i for s in site.draft["sections"] for i in s["items"] if i["id"] == product.code)
    assert item["image"] == product.preview
    assert item["images"][0]["url"] == product.images.get().url


def test_native_navigation_separates_owner_and_system(owner_client):
    response = owner_client.get("/django-admin/")
    assert response.status_code == 200
    assert [group["name"] for group in response.context["app_list"]] == [
        "Владельцу сайта",
        "Система",
    ]
    assert {m["object_name"] for m in response.context["app_list"][0]["models"]} == {
        "Lead",
        "Product",
    }


def test_nonstaff_cannot_write_catalog(client, site):
    response = client.post("/django-admin/cms/product/add/", payload(site))
    assert response.status_code == 302
    assert not Product.objects.filter(code="native-product").exists()


@pytest.mark.parametrize(
    "changes",
    [
        {"promo_enabled": "on", "promo_label": "Акция", "promo_price": "999"},
        {
            "promo_enabled": "on",
            "promo_label": "Акция",
            "promo_starts_on": "2026-10-20",
            "promo_ends_on": "2026-10-01",
        },
        {"preview_upload": SimpleUploadedFile("broken.png", b"not-a-photo", "image/png")},
        {"attributes": "Формат: 1 НФ\nформат: 2 НФ"},
    ],
)
def test_invalid_media_and_promo_do_not_create_products(owner_client, site, changes):
    response = owner_client.post("/django-admin/cms/product/add/", payload(site, **changes))
    assert response.status_code == 200
    assert response.context["adminform"].form.errors
    assert not Product.objects.filter(code="native-product").exists()
    assert not ContentRevision.objects.exists()


def test_api_edits_refresh_projection_without_replacing_identity(site, editor):
    from cms.services import update_content

    sync_products(site.draft)
    product = Product.objects.filter(language="ru").first()
    for section in site.draft["sections"]:
        for item in section["items"]:
            if item["id"] == product.code:
                item["title"] = "Из React-редактора"
                item["image"] = "/cover-independent.jpg"
                item["images"] = [{"id": "side", "url": "/side.jpg", "alt": "Сбоку"}]
    update_content(expected_revision=1, editor=editor, document=site.draft)
    product.refresh_from_db()
    assert product.title == "Из React-редактора"
    assert product.preview == "/cover-independent.jpg"
    assert product.images.get().url == "/side.jpg"


def test_import_migration_preserves_draft_and_publication(site):
    import importlib

    from django.apps import apps

    before = json.dumps(site.draft, sort_keys=True)
    importlib.import_module("cms.migrations.0005_import_catalog_draft").import_draft(apps, None)
    assert Product.objects.exists()
    site.refresh_from_db()
    assert json.dumps(site.draft, sort_keys=True) == before
    assert json.dumps(site.published, sort_keys=True) == before
    assert not ContentRevision.objects.exists()
