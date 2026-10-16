from django.db import migrations


def import_draft(apps, schema_editor):
    SiteContent = apps.get_model("cms", "SiteContent")
    Product = apps.get_model("cms", "Product")
    ProductImage = apps.get_model("cms", "ProductImage")
    site = SiteContent.objects.filter(key="main").first()
    if not site:
        return
    for language, content in [
        ("ru", site.draft),
        ("kk", site.draft.get("translations", {}).get("kk", {})),
    ]:
        for section in content.get("sections", []):
            if section["type"] != "catalog":
                continue
            for item in section["items"]:
                product = Product.objects.create(
                    language=language,
                    section_id=section["id"],
                    code=item["id"],
                    preview=item.get("image", ""),
                    price=item.get("price", 0),
                    **{
                        key: item.get(key) or default
                        for key, default in {
                            "title": "",
                            "text": "",
                            "category": "",
                            "tag": "",
                            "attributes": [],
                            "promo": {},
                            "seo_title": "",
                            "seo_description": "",
                        }.items()
                    },
                )
                for position, image in enumerate(item.get("images", []), 1):
                    ProductImage.objects.create(
                        product=product,
                        image_id=image["id"],
                        url=image["url"],
                        alt=image["alt"],
                        position=position,
                    )


class Migration(migrations.Migration):
    dependencies = [("cms", "0004_product_productimage")]
    operations = [migrations.RunPython(import_draft, migrations.RunPython.noop)]
