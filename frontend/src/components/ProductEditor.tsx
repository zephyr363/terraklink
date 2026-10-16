import type { ContentItem, ProductImage, Promotion } from "../domain/content";
import { productImages, withProductImages } from "../domain/products";

// Image identity is stable while rows move or an asynchronous upload is running.
export function ProductEditor({
  item,
  onChange,
  onUpload,
  onPromoUpload,
  onPreviewUpload,
  uploading,
}: {
  item: ContentItem;
  onChange: (patch: Partial<ContentItem>) => void;
  onUpload: (file: File, imageId: string) => void;
  onPromoUpload: (file: File) => void;
  onPreviewUpload: (file: File) => void;
  uploading: boolean;
}) {
  const images = productImages(item);
  const updateImages = (next: ProductImage[]) =>
    onChange(withProductImages(item, next));
  const patchPromo = (patch: Partial<Promotion>) =>
    onChange({
      promo: {
        enabled: false,
        label: "",
        text: "",
        price: null,
        ...item.promo,
        ...patch,
      },
    });
  return (
    <>
      <fieldset>
        <legend>Превью товара</legend>
        <p className="muted">
          Отдельная обложка товара. Изменение карусели не меняет превью.
        </p>
        <label>
          Ссылка на превью
          <input
            required
            maxLength={1000}
            value={item.image}
            onChange={(e) => onChange({ image: e.target.value })}
          />
        </label>
        {item.image && (
          <img
            className="editor-media-preview"
            src={item.image}
            alt={item.title}
          />
        )}
        <label>
          Загрузить превью
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onPreviewUpload(file);
              e.target.value = "";
            }}
          />
        </label>
      </fieldset>
      <fieldset>
        <legend>Характеристики товара</legend>
        {(item.attributes ?? []).map((row, index) => (
          <div className="editor-fields" key={index}>
            <label>
              Название характеристики
              <input
                maxLength={80}
                value={row.name}
                onChange={(e) =>
                  onChange({
                    attributes: item.attributes!.map((r, i) =>
                      i === index ? { ...r, name: e.target.value } : r,
                    ),
                  })
                }
              />
            </label>
            <label>
              Значение характеристики
              <input
                maxLength={200}
                value={row.value}
                onChange={(e) =>
                  onChange({
                    attributes: item.attributes!.map((r, i) =>
                      i === index ? { ...r, value: e.target.value } : r,
                    ),
                  })
                }
              />
            </label>
            <button
              className="danger-button"
              onClick={() =>
                onChange({
                  attributes: item.attributes!.filter((_, i) => i !== index),
                })
              }
            >
              Удалить характеристику
            </button>
          </div>
        ))}
        <button
          className="button outline"
          disabled={(item.attributes?.length ?? 0) >= 20}
          onClick={() =>
            onChange({
              attributes: [...(item.attributes ?? []), { name: "", value: "" }],
            })
          }
        >
          Добавить характеристику
        </button>
      </fieldset>
      <fieldset className="product-media-editor">
        <legend>Фотографии товара</legend>
        <p className="muted">
          До 12 фото. Первое используется как обложка. Удаление здесь убирает
          фото из товара, исходный файл остаётся в хранилище. Карусель в
          карточке и на детальной странице появляется при добавлении двух и
          более фотографий.
        </p>
        {images.map((image, index) => (
          <div className="gallery-editor-row" key={image.id}>
            <strong>
              Фото {index + 1}
              {index === 0 ? " · Обложка" : ""}
            </strong>
            {image.url && (
              <img
                src={image.url}
                alt={image.alt}
                className="editor-media-preview"
              />
            )}
            <label>
              Ссылка на фото
              <input
                maxLength={1000}
                value={image.url}
                onChange={(e) =>
                  updateImages(
                    images.map((row) =>
                      row.id === image.id
                        ? { ...row, url: e.target.value }
                        : row,
                    ),
                  )
                }
              />
            </label>
            <label>
              Описание фото (alt)
              <input
                maxLength={200}
                value={image.alt}
                onChange={(e) =>
                  updateImages(
                    images.map((row) =>
                      row.id === image.id
                        ? { ...row, alt: e.target.value }
                        : row,
                    ),
                  )
                }
              />
            </label>
            <label className="upload-label">
              Загрузить фото товара
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(file, image.id);
                  e.target.value = "";
                }}
              />
            </label>
            <div className="gallery-actions">
              {[-1, 1].map((direction) => (
                <button
                  key={direction}
                  className="button outline small"
                  disabled={
                    uploading ||
                    index + direction < 0 ||
                    index + direction >= images.length
                  }
                  onClick={() => {
                    const next = [...images];
                    [next[index], next[index + direction]] = [
                      next[index + direction],
                      next[index],
                    ];
                    updateImages(next);
                  }}
                >
                  {direction < 0 ? "Фото выше" : "Фото ниже"}
                </button>
              ))}
              <button
                className="danger-button"
                disabled={uploading}
                onClick={() =>
                  updateImages(images.filter((row) => row.id !== image.id))
                }
              >
                Удалить фото
              </button>
            </div>
          </div>
        ))}
        <button
          className="button outline"
          disabled={uploading || images.length >= 12}
          onClick={() =>
            updateImages([
              ...images,
              { id: crypto.randomUUID(), url: "", alt: item.title },
            ])
          }
        >
          Добавить фото
        </button>
      </fieldset>
      <fieldset>
        <legend>Промо товара</legend>
        {item.promo ? (
          <>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={item.promo.enabled}
                onChange={(e) => patchPromo({ enabled: e.target.checked })}
              />
              Показывать промо
            </label>
            <label>
              Название промо
              <input
                maxLength={80}
                value={item.promo.label}
                onChange={(e) => patchPromo({ label: e.target.value })}
              />
            </label>
            <label>
              Текст промо
              <textarea
                maxLength={1000}
                value={item.promo.text}
                onChange={(e) => patchPromo({ text: e.target.value })}
              />
            </label>
            <label>
              Промо-цена, ₸ (пусто — обычная цена)
              <input
                type="number"
                min={0}
                max={Number(item.price)}
                step="0.01"
                value={item.promo.price ?? ""}
                onChange={(e) =>
                  patchPromo({
                    price: e.target.value === "" ? null : e.target.value,
                  })
                }
              />
            </label>
            <div className="editor-fields">
              <label>
                Начало акции
                <input
                  type="date"
                  value={item.promo.starts_on ?? ""}
                  onChange={(e) =>
                    patchPromo({ starts_on: e.target.value || null })
                  }
                />
              </label>
              <label>
                Конец акции
                <input
                  type="date"
                  value={item.promo.ends_on ?? ""}
                  onChange={(e) =>
                    patchPromo({ ends_on: e.target.value || null })
                  }
                />
              </label>
            </div>
            <p className="muted">
              Даты включительно, время Казахстана (UTC+5). Пустые даты не
              ограничивают период.
            </p>
            <button
              className="danger-button"
              onClick={() => onChange({ promo: null })}
            >
              Удалить промо
            </button>
          </>
        ) : (
          <button className="button outline" onClick={() => patchPromo({})}>
            Добавить промо
          </button>
        )}
      </fieldset>
      {item.promo && (
        <fieldset>
          <legend>Изображение промо</legend>
          {item.promo.image && (
            <img
              className="editor-media-preview"
              src={item.promo.image}
              alt={item.promo.label}
            />
          )}
          <label>
            Ссылка на изображение промо
            <input
              maxLength={1000}
              value={item.promo.image ?? ""}
              onChange={(e) => patchPromo({ image: e.target.value })}
            />
          </label>
          <label>
            Загрузить изображение промо
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPromoUpload(file);
                e.target.value = "";
              }}
            />
          </label>
        </fieldset>
      )}
      <fieldset>
        <legend>SEO товара</legend>
        <label>
          SEO-заголовок товара
          <input
            maxLength={120}
            value={item.seo_title ?? ""}
            onChange={(e) => onChange({ seo_title: e.target.value })}
          />
        </label>
        <label>
          SEO-описание товара
          <textarea
            maxLength={320}
            value={item.seo_description ?? ""}
            onChange={(e) => onChange({ seo_description: e.target.value })}
          />
        </label>
        <p className="muted">
          Пустые поля используют название и описание товара.
        </p>
      </fieldset>
    </>
  );
}
