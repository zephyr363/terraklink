import { createContext, useContext, useEffect, useState } from "react";
import kk from "./kk.json";
import type { SiteDocument } from "../domain/content";

export type Language = "ru" | "kk";
export function translate(text: string, language: Language): string {
  return language === "kk"
    ? ((kk as Record<string, string>)[text] ?? text)
    : text;
}
export const LanguageContext = createContext({ language: "ru" as Language });
export function useTranslation() {
  const { language } = useContext(LanguageContext);
  return { language, t: (text: string) => translate(text, language) };
}
export function useSiteLanguage(previewLanguage?: Language) {
  const [language, setLanguage] = useState<Language>(() => {
    if (previewLanguage) return previewLanguage;
    try {
      return localStorage.getItem("tk-language") === "kk" ? "kk" : "ru";
    } catch {
      return "ru";
    }
  });
  useEffect(() => {
    if (previewLanguage) setLanguage(previewLanguage);
  }, [previewLanguage]);
  useEffect(() => {
    if (previewLanguage) return;
    document.documentElement.lang = language;
    try {
      localStorage.setItem("tk-language", language);
    } catch {
      /* Private browsing. */
    }
  }, [language, previewLanguage]);
  return {
    language,
    setLanguage,
    t: (text: string) => translate(text, language),
  };
}

// Only known demo text is translated as a fallback. Unknown client content stays intact.
export function localizedDocument(
  source: SiteDocument,
  language: Language,
): SiteDocument {
  if (language === "ru") return source;
  if (source.translations?.kk) return { ...source, ...source.translations.kk };
  return {
    ...source,
    company: {
      ...source.company,
      address: translate(source.company.address, "kk"),
    },
    sections: source.sections.map((section) => ({
      ...section,
      title: translate(section.title, "kk"),
      subtitle: translate(section.subtitle, "kk"),
      items: section.items.map((item) => ({
        ...item,
        title: translate(item.title, "kk"),
        text: translate(item.text, "kk"),
        category: translate(item.category, "kk"),
        tag: translate(item.tag, "kk"),
      })),
    })),
  };
}
export function withLocalizedDocument(
  source: SiteDocument,
  next: SiteDocument,
  language: Language,
): SiteDocument {
  if (language === "ru") return next;
  return {
    ...source,
    theme: next.theme,
    translations: {
      ...source.translations,
      kk: { company: next.company, sections: next.sections },
    },
  };
}
