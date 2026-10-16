import type { ContentItem } from "../domain/content";
import { activePromo } from "../domain/products";
import { useTranslation } from "../i18n";

export function ProductPromo({ item }: { item: ContentItem }) {
  const { t, language } = useTranslation();
  const promo = activePromo(item);
  if (!promo) return null;
  const hasMedia = !!promo.image || !!promo.video;
  return (
    <div className="product-promo">
      {hasMedia && (
        <div className="product-promo-media">
          {promo.video ? (
            <video
              className="product-promo-video"
              src={promo.video}
              poster={promo.image || undefined}
              controls
              preload="metadata"
              muted
              playsInline
            />
          ) : promo.image ? (
            <img
              className="product-promo-image"
              src={promo.image}
              alt={promo.label}
              loading="lazy"
            />
          ) : null}
        </div>
      )}
      <div className="product-promo-content">
        {promo.label && (
          <span className="product-promo-label">{promo.label}</span>
        )}
        {promo.text && (
          <p className="product-promo-text">{promo.text}</p>
        )}
      </div>
    </div>
  );
}
