"""Language-aware content accessors shared by catalog and SEO modules."""

from typing import Any


def localized_document(document: dict[str, Any], language: str) -> dict[str, Any]:
    """Return the document merged with the given language translation.

    Russian ("ru") is the base language and is returned as-is. For Kazakh ("kk")
    the translation subtree is merged on top of the base document so callers see
    the fully localized view.
    """
    if language == "ru":
        return document
    translation = document.get("translations", {}).get(language, {})
    return {
        **document,
        **translation,
        "seo": {**document.get("seo", {}), **translation.get("seo", {})},
    }


def localized_sections_root(document: dict[str, Any], language: str) -> dict[str, Any]:
    """Return the language-specific content root for iterating over sections.

    For Russian this is the base document; for Kazakh it is the ``translations.kk``
    subtree. Use this when you only need sections/items, not the merged document.
    """
    return document if language == "ru" else document.get("translations", {}).get("kk", {})
