import type { ContentItem } from "../domain/content";
import { activePromo, formatPrice } from "../domain/products";
import { useTranslation } from "../i18n";

export function ProductPrice({ item }: { item: ContentItem }) {
  const { t, language } = useTranslation();
  const promo = activePromo(item);
  const discounted = promo?.price != null;
  return (
    <span className="product-price">
      {discounted && <del>{formatPrice(item.price, language)} ₸</del>}
      <strong>
        {formatPrice(discounted ? promo.price! : item.price, language)} ₸{" "}
        <small>{t("/ шт.")}</small>
      </strong>
    </span>
  );
}
