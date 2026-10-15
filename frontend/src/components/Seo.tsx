import { useEffect } from "react";
import type { Language } from "../i18n";

// Fetch the same published metadata that is present in the initial server HTML.
// Draft previews must never replace the public metadata with unpublished text.
export function Seo({ path, language }: { path: string; language: Language }) {
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/seo/?${new URLSearchParams({ path, lang: language })}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Metadata unavailable");
        return response.json();
      })
      .then((meta) => {
        if (controller.signal.aborted) return;
        document.title = meta.title;
        const tag = (key: string, value: string, property = false) => {
          const attr = property ? "property" : "name";
          let element = document.head.querySelector<HTMLMetaElement>(
            `meta[${attr}="${key}"]`,
          );
          if (!element) {
            element = document.createElement("meta");
            element.setAttribute(attr, key);
            document.head.append(element);
          }
          element.content = value;
        };
        tag("description", meta.description);
        tag("robots", meta.robots);
        tag("og:title", meta.title, true);
        tag("og:description", meta.description, true);
        tag("og:url", meta.canonical, true);
        tag("og:image", meta.image, true);
        tag(
          "og:type",
          path.startsWith("/catalog/") ? "product" : "website",
          true,
        );
        tag("google-site-verification", meta.google_verification);
        tag("yandex-verification", meta.yandex_verification);
        document.head
          .querySelectorAll('link[rel="canonical"], link[hreflang]')
          .forEach((element) => element.remove());
        for (const row of [
          { rel: "canonical", href: meta.canonical },
          ...meta.alternates.map(
            (alternate: { lang: string; url: string }) => ({
              rel: "alternate",
              href: alternate.url,
              hreflang: alternate.lang,
            }),
          ),
        ]) {
          const link = document.createElement("link");
          Object.entries(row).forEach(([key, value]) =>
            link.setAttribute(key, String(value)),
          );
          document.head.append(link);
        }
        let schema = document.getElementById("site-schema");
        if (!schema) {
          schema = document.createElement("script");
          schema.id = "site-schema";
          schema.setAttribute("type", "application/ld+json");
          document.head.append(schema);
        }
        schema.textContent = JSON.stringify(meta.structured_data);
      })
      .catch(() => {
        /* Initial HTML remains valid if the metadata API is temporarily unavailable. */
      });
    return () => controller.abort();
  }, [path, language]);
  return null;
}
