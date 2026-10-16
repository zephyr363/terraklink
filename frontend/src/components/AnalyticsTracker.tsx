import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackEvent } from "../domain/analytics";
import { readConsent } from "../domain/consent";

export function AnalyticsTracker() {
  const location = useLocation();
  const recorded = useRef("");
  useEffect(() => {
    const record = () => {
      const key = location.key + location.pathname + location.search;
      if (!readConsent()?.analytics || recorded.current === key) return;
      recorded.current = key;
      trackEvent("page_view");
      if (/^\/catalog\/[a-zA-Z0-9_-]+$/.test(location.pathname))
        trackEvent("product_view");
    };
    record();
    window.addEventListener("tk-consent", record);
    return () => window.removeEventListener("tk-consent", record);
  }, [location.key, location.pathname, location.search]);
  return null;
}
