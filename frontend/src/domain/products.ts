import type { ContentItem, ProductImage } from "./content";

export function productImages(item: ContentItem): ProductImage[] {
  return (
    item.images ??
    (item.image ? [{ id: "cover", url: item.image, alt: item.title }] : [])
  );
}
export function withProductImages(
  item: ContentItem,
  images: ProductImage[],
): ContentItem {
  return { ...item, images, image: images[0]?.url ?? "" };
}
export function activePromo(
  item: ContentItem,
  today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Almaty",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()),
) {
  const promo = item.promo;
  return promo?.enabled &&
    (!promo.starts_on || promo.starts_on <= today) &&
    (!promo.ends_on || promo.ends_on >= today)
    ? promo
    : null;
}
