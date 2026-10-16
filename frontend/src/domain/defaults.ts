import type { SeoSettings, SiteDocument } from "./content";

// Only verifiable demo facts are supplied; domains, coordinates and verification tokens stay unset.
export function recommendedSeo(
  document: Pick<SiteDocument, "company" | "sections">,
  language: "ru" | "kk",
): SeoSettings {
  const name = document.company.name;
  const kazakh = language === "kk";
  return {
    title: (kazakh
      ? `${name} — Қазақстандағы кірпіш`
      : `${name} — кирпич в Казахстане`
    ).slice(0, 120),
    description: kazakh
      ? `${name}: қаптама кірпіш каталогы, сипаттамалары және жобалар бойынша кеңес. Баға мен жеткізу шарттарын менеджерден нақтылаңыз.`
      : `${name}: каталог облицовочного кирпича в Казахстане, характеристики и консультация по проекту. Цены, наличие и условия доставки уточняйте у менеджера.`,
    structured_data: true,
    ai_enabled: true,
    indexing: false,
    legal_name: name,
    areas_served: [kazakh ? "Қазақстан" : "Казахстан"],
    ai_summary: kazakh
      ? `${name} — кірпіш өнімдерінің ${document.company.demo ? "демонстрациялық " : ""}сайты. Каталогтан өнімді таңдап, кеңес сұрауға болады. Қызмет көрсету елі — Қазақстан.`
      : `${name} — ${document.company.demo ? "демонстрационный " : ""}сайт кирпичной продукции. На сайте можно выбрать товар из каталога и отправить заявку на консультацию. Страна работы — Казахстан.`,
    pages: {},
    faq: [],
  };
}

export function withRecommendedDefaults(source: SiteDocument): SiteDocument {
  const result = structuredClone(source);
  const fill = (
    content: Pick<SiteDocument, "company" | "sections" | "seo">,
    language: "ru" | "kk",
  ) => {
    const seo = { ...content.seo };
    for (const [key, value] of Object.entries(
      recommendedSeo(content, language),
    )) {
      const current = seo[key as keyof SeoSettings];
      if (
        current === undefined ||
        current === "" ||
        (Array.isArray(current) && !current.length)
      ) {
        Object.assign(seo, { [key]: value });
      }
    }
    content.seo = seo;
  };
  fill(result, "ru");
  if (result.translations?.kk) fill(result.translations.kk, "kk");
  return result;
}
