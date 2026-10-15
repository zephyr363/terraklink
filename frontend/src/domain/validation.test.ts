import { describe, expect, it } from "vitest";
import { validateDocument } from "./validation";
import { localizedDocument, withLocalizedDocument, translate } from "../i18n";
import { newSection } from "./content";
import type { SiteDocument } from "./content";

const document = (): SiteDocument => ({
  theme: { accent: "#ff6d00", font: "Open Sans" },
  company: {
    name: "TERRAKLINK",
    phone: "+7 (727) 000-00-00",
    email: "demo@example.kz",
    address: "Алматы",
    demo: true,
  },
  sections: [
    { ...newSection("hero"), title: "Кирпичный завод «TERRAKLINK»" },
    newSection("features"),
    {
      ...newSection("catalog"),
      items: ["a", "b"].map((id) => ({
        id,
        title: id,
        text: "",
        image: "",
        category: "",
        price: 1,
        tag: "",
      })),
    },
  ],
});
describe("editor validation", () => {
  it("accepts existing content and both languages", () => {
    const source = document();
    expect(validateDocument(source)).toEqual([]);
    expect(
      validateDocument(
        withLocalizedDocument(source, localizedDocument(source, "kk"), "kk"),
      ),
    ).toEqual([]);
  });
  it("rejects duplicate IDs, invalid prices, blank company data and unsafe links", () => {
    const source = document();
    source.company.phone = "123";
    source.company.email = "bad";
    source.company.name = " ";
    source.sections[1].id = source.sections[0].id;
    source.sections[2].items[0].price = "-1";
    source.sections[2].items[1].price = "1.123";
    source.sections[0].image = "javascript:alert(1)";
    expect(validateDocument(source).length).toBeGreaterThanOrEqual(6);
  });
  it("validates the hidden translation as well as the active document", () => {
    const source = document();
    source.translations = {
      kk: {
        company: { ...source.company, email: "wrong" },
        sections: source.sections,
      },
    };
    expect(
      validateDocument(source).some(
        (error) => error.includes("KZ") && error.includes("Email"),
      ),
    ).toBe(true);
  });
});
describe("localization", () => {
  it("keeps IDs and assets stable and never translates unknown client content", () => {
    const source = document();
    source.sections[1].title = "Мой собственный заголовок";
    const localized = localizedDocument(source, "kk");
    expect(localized.sections[0].title).toBe("«TERRAKLINK» кірпіш зауыты");
    expect(localized.sections[0].image).toBe(source.sections[0].image);
    expect(localized.sections[1].title).toBe(source.sections[1].title);
    expect(localized.sections.map((s) => s.id)).toEqual(
      source.sections.map((s) => s.id),
    );
  });
  it("stores edited Kazakh text without replacing Russian", () => {
    const source = document();
    const localized = localizedDocument(source, "kk");
    localized.sections[0].title = "Жаңа тақырып";
    const saved = withLocalizedDocument(source, localized, "kk");
    expect(saved.sections[0].title).toBe(source.sections[0].title);
    expect(localizedDocument(saved, "kk").sections[0].title).toBe(
      "Жаңа тақырып",
    );
    expect(translate("Каталог", "ru")).toBe("Каталог");
  });
});
