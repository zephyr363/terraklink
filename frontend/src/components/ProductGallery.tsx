import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ContentItem } from "../domain/content";
import { productImages } from "../domain/products";
import { useTranslation } from "../i18n";

export function ProductGallery({
  item,
  compact = false,
  onOpen,
}: {
  item: ContentItem;
  compact?: boolean;
  onOpen?: () => void;
}) {
  const { t } = useTranslation();
  const images = productImages(item);
  const [selected, setSelected] = useState(0);
  const index = images.length ? selected % images.length : 0;
  const current = images[index];
  return (
    <div
      className={`product-gallery ${compact ? "compact" : ""}`}
      aria-label={`${t("Фотографии товара")}: ${item.title}`}
    >
      {current?.url ? (
        <img
          src={current.url}
          alt={current.alt || item.title}
          loading={compact ? "lazy" : "eager"}
        />
      ) : (
        <div className="media-placeholder">{t("Фото пока нет")}</div>
      )}
      {onOpen && (
        <button
          className="gallery-open"
          onClick={onOpen}
          aria-label={`${t("Подробнее")}: ${item.title}`}
        />
      )}
      {images.length > 1 && (
        <>
          <button
            className="gallery-arrow previous"
            aria-label={t("Предыдущее фото")}
            onClick={() =>
              setSelected((index - 1 + images.length) % images.length)
            }
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className="gallery-arrow next"
            aria-label={t("Следующее фото")}
            onClick={() => setSelected((index + 1) % images.length)}
          >
            <ChevronRight size={20} />
          </button>
          {compact ? (
            <span className="gallery-count">
              {index + 1} / {images.length}
            </span>
          ) : (
            <div className="gallery-thumbnails">
              {images.map((image, i) => (
                <button
                  key={image.id}
                  aria-label={`${t("Фото")} ${i + 1}`}
                  aria-pressed={i === index}
                  onClick={() => setSelected(i)}
                >
                  <img src={image.url} alt={image.alt || item.title} />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
