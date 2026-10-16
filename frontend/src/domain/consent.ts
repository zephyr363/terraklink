export const CONSENT_VERSION = "2026-10-16";
export interface CookieConsent {
  version: string;
  analytics: boolean;
  at: string;
}
export function readConsent(): CookieConsent | null {
  try {
    const value = JSON.parse(localStorage.getItem("tk-consent") ?? "null");
    return value?.version === CONSENT_VERSION &&
      typeof value.analytics === "boolean"
      ? value
      : null;
  } catch {
    return null;
  }
}
export function saveConsent(analytics: boolean): CookieConsent {
  const value = {
    version: CONSENT_VERSION,
    analytics,
    at: new Date().toISOString(),
  };
  try {
    localStorage.setItem("tk-consent", JSON.stringify(value));
  } catch {
    /* Keep the choice in memory when browser storage is unavailable. */
  }
  window.dispatchEvent(new Event("tk-consent"));
  return value;
}
export const cities = [
  { name: "Алматы", lat: 43.2389, lon: 76.8897 },
  { name: "Астана", lat: 51.1694, lon: 71.4491 },
  { name: "Шымкент", lat: 42.3417, lon: 69.5901 },
  { name: "Караганда", lat: 49.8047, lon: 73.1094 },
  { name: "Актобе", lat: 50.2839, lon: 57.167 },
  { name: "Атырау", lat: 47.0945, lon: 51.9238 },
  { name: "Кызылорда", lat: 44.8488, lon: 65.4823 },
  { name: "Павлодар", lat: 52.2873, lon: 76.9674 },
  { name: "Костанай", lat: 53.2144, lon: 63.6246 },
  { name: "Актау", lat: 43.6353, lon: 51.1694 },
  { name: "Усть-Каменогорск", lat: 49.9483, lon: 82.6275 },
  { name: "Тараз", lat: 42.9, lon: 71.3667 },
];
export function nearestCity(
  latitude: number,
  longitude: number,
): string | null {
  const distance = (city: (typeof cities)[number]) => {
    const rad = Math.PI / 180;
    const a =
      Math.sin(((city.lat - latitude) * rad) / 2) ** 2 +
      Math.cos(latitude * rad) *
        Math.cos(city.lat * rad) *
        Math.sin(((city.lon - longitude) * rad) / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  const nearest = [...cities].sort((a, b) => distance(a) - distance(b))[0];
  return distance(nearest) < 150 ? nearest.name : null;
}
