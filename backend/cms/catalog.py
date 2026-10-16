"""Keep the native admin projection and the revisioned JSON draft in one transaction."""

from copy import deepcopy

from django.db import transaction

from .models import Product, ProductImage


def localized(document, language):
    return document if language == "ru" else document.get("translations", {}).get("kk", {})


@transaction.atomic
def sync_products(document):
    retained = []
    for language in ("ru", "kk"):
        for section in localized(document, language).get("sections", []):
            if section["type"] != "catalog":
                continue
            for item in section["items"]:
                product, _ = Product.objects.update_or_create(
                    language=language,
                    code=item["id"],
                    defaults={
                        "section_id": section["id"],
                        "preview": item.get("image", ""),
                        **{
                            key: (item.get(key) or default)
                            for key, default in {
                                "title": "",
                                "text": "",
                                "category": "",
                                "price": 0,
                                "tag": "",
                                "attributes": [],
                                "promo": {},
                                "seo_title": "",
                                "seo_description": "",
                            }.items()
                        },
                    },
                )
                retained.append(product.pk)
                # IDs of unchanged images and products survive saves in either editor.
                image_ids = []
                for index, image in enumerate(item.get("images", [])):
                    row, _ = ProductImage.objects.update_or_create(
                        product=product,
                        image_id=image["id"],
                        defaults={"url": image["url"], "alt": image["alt"], "position": index + 1},
                    )
                    image_ids.append(row.pk)
                product.images.exclude(pk__in=image_ids).delete()
    Product.objects.exclude(pk__in=retained).delete()


def product_item(product):
    return {
        "id": product.code,
        "image": product.preview,
        **{
            key: getattr(product, key)
            for key in (
                "title",
                "text",
                "category",
                "tag",
                "attributes",
                "seo_title",
                "seo_description",
            )
        },
        "price": str(product.price),
        "promo": product.promo or None,
        "images": [
            {"id": image.image_id, "url": image.url, "alt": image.alt}
            for image in product.images.all()
        ],
    }


def patch_product(document, product, *, delete=False):
    result = deepcopy(document)
    section = next(
        s
        for s in localized(result, product.language)["sections"]
        if s["id"] == product.section_id and s["type"] == "catalog"
    )
    previous = next(
        (i for i, item in enumerate(section["items"]) if item["id"] == product.code), None
    )
    if delete:
        section["items"] = [item for item in section["items"] if item["id"] != product.code]
    elif previous is None:
        section["items"].append(product_item(product))
    else:
        section["items"][previous] = product_item(product)
    return result
