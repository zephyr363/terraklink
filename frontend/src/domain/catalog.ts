import type { ContentItem } from "./content";
import { activePromo } from "./products";

export interface CatalogFilter {
  search: string;
  category: string;
  min: string;
  max: string;
  promoOnly: boolean;
  sort: "default" | "price-asc" | "price-desc" | "name";
}
export const salePrice = (item: ContentItem) =>
  Number(activePromo(item)?.price ?? item.price);
export function filterProducts(items: ContentItem[], filter: CatalogFilter) {
  const result = items.filter(
    (item) =>
      (filter.category === "Все" || item.category === filter.category) &&
      `${item.title} ${item.id} ${item.text}`
        .toLocaleLowerCase()
        .includes(filter.search.trim().toLocaleLowerCase()) &&
      (!filter.min || salePrice(item) >= Number(filter.min)) &&
      (!filter.max || salePrice(item) <= Number(filter.max)) &&
      (!filter.promoOnly || !!activePromo(item)),
  );
  if (filter.sort === "price-asc")
    result.sort((a, b) => salePrice(a) - salePrice(b));
  if (filter.sort === "price-desc")
    result.sort((a, b) => salePrice(b) - salePrice(a));
  if (filter.sort === "name")
    result.sort((a, b) => a.title.localeCompare(b.title));
  return result;
}
