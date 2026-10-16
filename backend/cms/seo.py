"""Build safe, published-only discovery documents for browsers and crawlers."""

import json
from urllib.parse import quote, urljoin

from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from django.utils.html import escape
from django.views.decorators.http import require_GET

from .localization import localized_document
from .marketing import active_promo, gallery, products
from .models import SiteContent
from .seo_serializers import PUBLIC_PAGES

PAGE_NAMES = {
    "ru": ["Главная", "Каталог", "О заводе", "Портфолио", "Информация", "Где купить", "Контакты"],
    "kk": [
        "Басты бет",
        "Каталог",
        "Зауыт туралы",
        "Портфолио",
        "Ақпарат",
        "Қайдан сатып алуға болады",
        "Байланыс",
    ],
}


def published():
    return SiteContent.objects.get(key="main").published


def language(request):
    return "kk" if request.GET.get("lang") == "kk" else "ru"


def page_url(base, path, lang):
    return base.rstrip("/") + path + ("?lang=kk" if lang == "kk" else "")


def _legal_titles(lang):
    return {
        "/legal/privacy": "Политика конфиденциальности" if lang == "ru" else "Құпиялылық саясаты",
        "/legal/terms": "Пользовательское соглашение" if lang == "ru" else "Пайдаланушы келісімі",
        "/legal/consent": "Согласие на обработку данных"
        if lang == "ru"
        else "Деректерді өңдеуге келісім",
        "/legal/cookies": "Политика cookies" if lang == "ru" else "Cookies саясаты",
    }


def _page_title(view, shared, path, lang, product, company):
    """Resolve the page <title> from product SEO, page overrides, or fallback."""
    legal_titles_map = _legal_titles(lang)
    default_title = dict(zip(PUBLIC_PAGES, PAGE_NAMES[lang])).get(
        path, legal_titles_map.get(path, "Страница не найдена" if lang == "ru" else "Бет табылмады")
    )
    overrides = shared.get("pages", {}).get(path, {})
    if product:
        return product.get("seo_title") or product["title"]
    return (
        overrides.get("title")
        or (shared.get("title") if path == "/" else "")
        or f"{default_title} — {company['name']}"
    )


def _page_description(view, shared, path, lang, product):
    """Resolve the page <meta description> from product SEO, overrides, or fallback."""
    overrides = shared.get("pages", {}).get(path, {})
    if product:
        return product.get("seo_description") or product.get("text", "")
    return (
        overrides.get("description")
        or shared.get("description")
        or (
            "Каталог кирпича и консультации по Казахстану."
            if lang == "ru"
            else "Кірпіш каталогы және Қазақстан бойынша кеңес."
        )
    )


def _calc_indexable(shared, document, company, exists, path):
    """Decide whether the page should be indexed by search engines."""
    return bool(
        shared.get("indexing")
        and shared.get("site_url")
        and not document["company"].get("demo")
        and not company.get("demo")
        and exists
        and not path.startswith("/legal/")
    )


def _build_organization(settings, company, base, absolute):
    """Build the Schema.org Organization (optionally LocalBusiness) node."""
    organization = {
        "@type": "Organization",
        "@id": base + "/#organization",
        "name": company["name"],
        "url": base,
        "telephone": company["phone"],
        "email": company["email"],
        "areaServed": settings.get("areas_served") or ["Казахстан"],
    }
    if settings.get("legal_name"):
        organization["legalName"] = settings["legal_name"]
    if settings.get("logo"):
        organization["logo"] = absolute(settings["logo"])
    if settings.get("same_as"):
        organization["sameAs"] = settings["same_as"]
    if not company.get("demo") and settings.get("city"):
        organization.update(
            {
                "@type": "LocalBusiness",
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": company["address"],
                    "addressLocality": settings["city"],
                    "addressRegion": settings.get("region", ""),
                    "postalCode": settings.get("postal_code", ""),
                    "addressCountry": "KZ",
                },
            }
        )
        if settings.get("latitude") is not None and settings.get("longitude") is not None:
            organization["geo"] = {
                "@type": "GeoCoordinates",
                "latitude": settings["latitude"],
                "longitude": settings["longitude"],
            }
    return organization


def _build_website(company, base):
    """Build the Schema.org WebSite node."""
    return {
        "@type": "WebSite",
        "@id": base + "/#website",
        "url": base,
        "name": company["name"],
        "inLanguage": ["ru-KZ", "kk-KZ"],
    }


def _build_product_node(product, images, base, absolute, company, canonical):
    """Build the Schema.org Product node with price and promo info."""
    node = {
        "@type": "Product",
        "name": product["title"],
        "sku": product["id"],
        "description": product.get("text", ""),
        "url": canonical,
        "image": [absolute(i["url"]) for i in images],
        "brand": {"@type": "Brand", "name": company["name"]},
    }
    promo = active_promo(product)
    price = (
        promo["price"]
        if promo and promo.get("price") is not None
        else product.get("price", 0)
    )
    return node, price, promo


def _build_faq(settings):
    """Build the Schema.org FAQPage node if FAQs are configured on the home page."""
    if not settings.get("faq"):
        return None
    return {
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": row["question"],
                "acceptedAnswer": {"@type": "Answer", "text": row["answer"]},
            }
            for row in settings["faq"]
        ],
    }


def _build_breadcrumbs(company, base, lang, path, product, title):
    """Build the Schema.org BreadcrumbList node."""
    elements = [
        {
            "@type": "ListItem",
            "position": 1,
            "name": company["name"],
            "item": page_url(base, "/", lang),
        }
    ]
    if path != "/":
        elements.append(
            {
                "@type": "ListItem",
                "position": 2,
                "name": product["title"] if product else title,
                "item": page_url(base, path, lang),
            }
        )
    return {"@type": "BreadcrumbList", "itemListElement": elements}


def metadata(document, path, lang, fallback_origin):
    view = localized_document(document, lang)
    shared = document.get("seo", {})
    settings = {**shared, **view.get("seo", {})}
    base = shared.get("site_url") or fallback_origin.rstrip("/")
    company = view["company"]
    items = products(view)
    product = next((item for item in items if path == "/catalog/" + item["id"]), None)

    title = _page_title(view, shared, path, lang, product, company)
    description = _page_description(view, shared, path, lang, product)
    exists = path in PUBLIC_PAGES or product is not None or path in _legal_titles(lang)
    indexable = _calc_indexable(shared, document, company, exists, path)
    canonical = page_url(base, path, lang)
    images = gallery(product) if product else []
    image = images[0]["url"] if images else settings.get("og_image", "")

    def absolute(value):
        return urljoin(base + "/", value) if value else ""

    nodes = []
    if shared.get("structured_data", True) and exists:
        nodes.append(_build_organization(settings, company, base, absolute))
        nodes.append(_build_website(company, base))
        if product:
            node, price, promo = _build_product_node(product, images, base, absolute, company, canonical)
            if not company.get("demo"):
                node["offers"] = {
                    "@type": "Offer",
                    "price": str(price),
                    "priceCurrency": "KZT",
                    "url": canonical,
                }
            nodes.append(node)
        faq_node = _build_faq(settings)
        if faq_node:
            nodes.append(faq_node)
        nodes.append(_build_breadcrumbs(company, base, lang, path, product, title))

    return {
        "title": title,
        "description": description,
        "canonical": canonical,
        "robots": "index, follow" if indexable else "noindex, nofollow",
        "image": absolute(image),
        "language": lang,
        "alternates": [
            {"lang": code + "-KZ", "url": page_url(base, path, code)}
            for code in ("ru", "kk")
            if exists
            and (
                not product
                or any(item["id"] == product["id"] for item in products(localized_document(document, code)))
            )
        ],
        "structured_data": {"@context": "https://schema.org", "@graph": nodes},
        "exists": exists,
        "google_verification": shared.get("google_verification", ""),
        "yandex_verification": shared.get("yandex_verification", ""),
    }


@require_GET
def seo_api(request):
    path = request.GET.get("path", "/")
    if len(path) > 300 or not path.startswith("/") or "?" in path or "#" in path:
        return JsonResponse({"detail": "Некорректный путь страницы."}, status=400)
    return JsonResponse(
        metadata(published(), path, language(request), request.build_absolute_uri("/"))
    )


@require_GET
def public_page(request, path=""):
    path = "/" + path
    document = published()
    lang = language(request)
    meta = metadata(document, path, lang, request.build_absolute_uri("/"))
    view = localized_document(document, lang)
    items = products(view)
    product = next((item for item in items if path == "/catalog/" + item["id"]), None)
    schema = (
        json.dumps(meta["structured_data"], ensure_ascii=False)
        .replace("<", "\\u003c")
        .replace(">", "\\u003e")
        .replace("&", "\\u0026")
    )
    response = render(
        request,
        "public.html",
        {
            "meta": meta,
            "schema_json": schema,
            "company": view["company"],
            "product": product,
            "images": gallery(product) if product else [],
            "promo": active_promo(product) if product else None,
            "products": items if path in ("/", "/catalog") else [],
            "faq": view.get("seo", {}).get("faq", []) if path == "/" else [],
            "summary": view.get("seo", {}).get("ai_summary", "") if path == "/" else "",
            "sections": [
                section
                for section in view.get("sections", [])
                if section.get("visible")
                and (
                    path == "/"
                    or (path == "/about" and section.get("type") in ("about", "features"))
                    or (path == "/projects" and section.get("type") == "projects")
                )
            ],
        },
        status=200 if meta["exists"] else 404,
    )
    response["X-Robots-Tag"] = meta["robots"]
    response["Cache-Control"] = "no-cache"
    return response


@require_GET
def robots(request):
    document = published()
    seo = document.get("seo", {})
    enabled = seo.get("indexing") and seo.get("site_url") and not document["company"].get("demo")
    text = "User-agent: *\n" + (
        "Allow: /\nDisallow: /admin\nDisallow: /analytics\nDisallow: /management\nDisallow: /django-admin/\nDisallow: /api/\n"
        if enabled
        else "Disallow: /\n"
    )
    if enabled:
        text += "Sitemap: " + seo["site_url"] + "/sitemap.xml\n"
    return HttpResponse(text, content_type="text/plain; charset=utf-8")


@require_GET
def sitemap(request):
    document = published()
    seo = document.get("seo", {})
    enabled = seo.get("indexing") and seo.get("site_url") and not document["company"].get("demo")
    urls = []
    if enabled:
        for code in ("ru", "kk"):
            paths = [
                *PUBLIC_PAGES,
                *["/catalog/" + quote(item["id"]) for item in products(localized_document(document, code))],
            ]
            for path in paths:
                urls.append(
                    "<url><loc>"
                    + str(escape(page_url(seo["site_url"], path, code)))
                    + "</loc></url>"
                )
    return HttpResponse(
        '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        + "".join(urls)
        + "</urlset>",
        content_type="application/xml",
    )


@require_GET
def llms(request):
    document = published()
    settings = document.get("seo", {})
    if (
        not settings.get("site_url")
        or not settings.get("ai_enabled", True)
        or not settings.get("indexing")
        or document["company"].get("demo")
    ):
        return HttpResponse(
            "Информация для ИИ-поиска пока не опубликована.\n",
            content_type="text/plain; charset=utf-8",
        )
    company = document["company"]
    lines = [
        "# " + company["name"],
        settings.get("ai_summary", ""),
        "",
        "## Контакты",
        company["address"],
        company["phone"],
        company["email"],
        "",
        "## Страницы",
    ]
    for path, name in zip(PUBLIC_PAGES, PAGE_NAMES["ru"]):
        lines.append(f"- [{name}]({page_url(settings.get('site_url', ''), path, 'ru')})")
    return HttpResponse("\n".join(lines) + "\n", content_type="text/plain; charset=utf-8")
