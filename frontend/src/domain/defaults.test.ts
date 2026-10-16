import { expect, it } from "vitest";
import { withRecommendedDefaults } from "./defaults";
import type { SiteDocument } from "./content";

it("fills safe starter facts without overwriting client fields or enabling indexing", () => {
  const source: SiteDocument = {
    theme: { accent: "#ff7000", font: "Open Sans" },
    company: {
      name: "TerraKlink",
      phone: "+77000000000",
      email: "demo@example.com",
      address: "Казахстан",
      demo: true,
    },
    sections: [],
    seo: { title: "Мой заголовок", indexing: false, areas_served: ["Астана"] },
  };
  const result = withRecommendedDefaults(source);
  expect(result.seo?.title).toBe("Мой заголовок");
  expect(result.seo?.areas_served).toEqual(["Астана"]);
  expect(result.seo?.description).toContain("Казахстане");
  expect(result.seo?.site_url).toBeUndefined();
  expect(result.seo?.latitude).toBeUndefined();
  expect(result.seo?.indexing).toBe(false);
  expect(source.seo?.description).toBeUndefined();
  expect(withRecommendedDefaults(result)).toEqual(result);
});
