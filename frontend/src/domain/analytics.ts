import { readConsent, CONSENT_VERSION } from "./consent";

// No query strings, names, phone numbers, referrers or persistent visitor IDs.
export function trackEvent(event: "page_view" | "product_view" | "lead_sent") {
  if (!readConsent()?.analytics) return;
  const path = window.location.pathname;
  if (
    !/^\/(?:catalog(?:\/[a-zA-Z0-9_-]{1,80})?|projects|contacts|information|about|dealers|legal\/(?:privacy|cookies|terms|consent))?$/.test(
      path,
    )
  )
    return;
  void fetch("/api/analytics/events/", {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event,
      path,
      language:
        new URLSearchParams(location.search).get("lang") === "kk" ? "kk" : "ru",
      consent: true,
      consent_version: CONSENT_VERSION,
    }),
  }).catch(() => {
    /* Analytics must never interrupt navigation or a submitted form. */
  });
}
