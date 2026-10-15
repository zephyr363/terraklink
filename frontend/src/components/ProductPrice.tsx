import type { ContentItem } from "../domain/content";
import { activePromo } from "../domain/products";
import { useTranslation } from "../i18n";

export function ProductPrice({ item }: { item: ContentItem }) {
  const { t, language } = useTranslation();
  const promo = activePromo(item);
  const discounted = promo?.price != null;
  const format = (price: string | number) =>
    Number(price).toLocaleString(language === "kk" ? "kk-KZ" : "ru-RU");
  return (
    <span className="product-price">
      {discounted && <del>{format(item.price)} ₸</del>}
      <strong>
        {format(discounted ? promo.price! : item.price)} ₸{" "}
        <small>{t("/ шт.")}</small>
      </strong>
    </span>
  );
}
