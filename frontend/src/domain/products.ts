import type { ContentItem, ProductImage, ProductListItem } from "./content";

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
  return { ...item, images };
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

export function formatPrice(
  price: string | number,
  language: string,
): string {
  return Number(price).toLocaleString(language === "kk" ? "kk-KZ" : "ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function toContentItem(item: ProductListItem): ContentItem {
  return {
    id: item.code,
    title: item.title,
    text: item.text,
    image: item.preview,
    category: item.category,
    price: item.price,
    tag: item.tag,
    attributes: item.attributes,
    images: item.images,
    promo: item.promo
      ? {
          ...item.promo,
          price: item.promo.price,
        }
      : null,
    seo_title: item.seo_title,
    seo_description: item.seo_description,
  };
}
