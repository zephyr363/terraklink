import { describe, expect, it } from "vitest";
import { filterProducts, type CatalogFilter } from "./catalog";
import type { ContentItem } from "./content";
const item = (id: string, price: number): ContentItem => ({
  id,
  title: id,
  price,
  category: "Кирпич",
  text: "Описание",
  image: "",
  tag: "",
});
const base: CatalogFilter = {
  search: "",
  category: "Все",
  min: "",
  max: "",
  promoOnly: false,
  sort: "default",
};
describe("catalog", () => {
  it("filters and sorts by current promotional price without mutating source", () => {
    const products = [
      item("A", 200),
      {
        ...item("B", 400),
        promo: { enabled: true, label: "Sale", text: "", price: 100 },
      },
    ];
    expect(
      filterProducts(products, { ...base, sort: "price-asc" }).map((p) => p.id),
    ).toEqual(["B", "A"]);
    expect(products[0].id).toBe("A");
    expect(
      filterProducts(products, { ...base, max: "150" }).map((p) => p.id),
    ).toEqual(["B"]);
    expect(
      filterProducts(products, { ...base, promoOnly: true }).map((p) => p.id),
    ).toEqual(["B"]);
  });
  it("combines category, text and bounds", () => {
    expect(
      filterProducts([item("A", 200)], {
        ...base,
        search: "описание",
        min: "200",
        max: "200",
        category: "Кирпич",
      }),
    ).toHaveLength(1);
    expect(
      filterProducts([item("A", 200)], { ...base, min: "300", max: "100" }),
    ).toHaveLength(0);
  });
});
