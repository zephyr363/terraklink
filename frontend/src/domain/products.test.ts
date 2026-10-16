import { describe, it, expect } from "vitest";
import { activePromo, productImages, withProductImages } from "./products";
import type { ContentItem } from "./content";

const item: ContentItem = {
  id: "brick",
  title: "Кирпич",
  text: "",
  image: "/cover.jpg",
  price: 100,
  tag: "",
  category: "",
};
describe("product marketing rules", () => {
  it("keeps legacy covers and makes gallery deletion authoritative", () => {
    expect(productImages(item)[0].url).toBe("/cover.jpg");
    expect(productImages({ ...item, images: [] })).toEqual([]);
    const changed = withProductImages(item, [
      { id: "side", url: "/side.jpg", alt: "Сбоку" },
    ]);
    expect(changed.image).toBe("/cover.jpg");
    expect(withProductImages(changed, []).image).toBe("/cover.jpg");
    expect(item.image).toBe("/cover.jpg");
  });
  it("uses inclusive campaign dates and honors disabling", () => {
    const product = {
      ...item,
      promo: {
        enabled: true,
        label: "Акция",
        text: "",
        price: 80,
        starts_on: "2026-10-01",
        ends_on: "2026-10-15",
      },
    };
    expect(activePromo(product, "2026-10-01")?.price).toBe(80);
    expect(activePromo(product, "2026-10-15")?.price).toBe(80);
    expect(activePromo(product, "2026-10-16")).toBeNull();
    expect(activePromo(product, "2026-09-30")).toBeNull();
    expect(
      activePromo(
        { ...product, promo: { ...product.promo, enabled: false } },
        "2026-10-10",
      ),
    ).toBeNull();
  });
});
