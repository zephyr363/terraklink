"""Published product and promotion rules shared by HTML and structured data."""

from zoneinfo import ZoneInfo

from django.utils import timezone


def products(document):
    return [
        item
        for section in document.get("sections", [])
        if section.get("visible") and section.get("type") == "catalog"
        for item in section.get("items", [])
    ]


def gallery(item):
    if "images" in item:
        return item["images"]
    return (
        [{"id": "cover", "url": item["image"], "alt": item["title"]}] if item.get("image") else []
    )


def active_promo(item, today=None):
    promo = item.get("promo") or {}
    today = today or timezone.localdate(timezone.now(), ZoneInfo("Asia/Almaty")).isoformat()
    if not promo.get("enabled"):
        return None
    if promo.get("starts_on") and str(promo["starts_on"]) > today:
        return None
    if promo.get("ends_on") and str(promo["ends_on"]) < today:
        return None
    return promo
