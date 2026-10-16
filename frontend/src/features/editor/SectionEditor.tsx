import { Image, Plus, Trash2, Upload } from "lucide-react";
import type { ContentItem, Font, Section } from "../../domain/content";
import { ProductEditor } from "../../components/ProductEditor";
import { sectionNames, fonts } from "./config";
export function SectionEditor({
  section,
  onChange,
  onUpload,
  uploading,
  uploadLimits,
}: {
  section: Section;
  onChange: (patch: Partial<Section>) => void;
  onUpload: (
    file: File,
    target: "image" | "video" | "promo",
    itemIndex?: number,
    imageId?: string,
  ) => void;
  uploading: boolean;
  uploadLimits?: { image_mb: number; video_mb: number };
}) {
  const patchItem = (index: number, patch: Partial<ContentItem>) =>
    onChange({
      items: section.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    });
  return (
    <div className="editor-card section-editor">
      <div className="editor-card-title">
        <div>
          <span className="eyebrow">{sectionNames[section.type]}</span>
          <h2>Содержание секции</h2>
        </div>
        <label className="checkbox toggle">
          <input
            type="checkbox"
            checked={section.visible}
            onChange={(e) => onChange({ visible: e.target.checked })}
          />
          Показывать на сайте
        </label>
      </div>
      <label>
        Заголовок
        <input
          value={section.title}
          maxLength={300}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </label>
      {section.type === "hero" && (
        <fieldset>
          <legend>Шаблон баннера</legend>
          <div className="editor-fields">
            <label>
              Тип баннера
              <select
                aria-label="Тип баннера"
                value={
                  section.banner?.template ??
                  (section.video ? "video" : "image")
                }
                onChange={(e) =>
                  onChange({
                    banner: {
                      animation: section.banner?.animation ?? "none",
                      template: e.target.value as NonNullable<
                        Section["banner"]
                      >["template"],
                    },
                  })
                }
              >
                <option value="image">Изображение (по умолчанию)</option>
                <option value="overlay">Изображение с текстом поверх</option>
                <option value="split">Изображение и текст рядом</option>
                <option value="video">Видео с обложкой</option>
              </select>
            </label>
            <label>
              Анимация
              <select
                aria-label="Анимация"
                value={section.banner?.animation ?? "none"}
                onChange={(e) =>
                  onChange({
                    banner: {
                      template:
                        section.banner?.template ??
                        (section.video ? "video" : "image"),
                      animation: e.target.value as NonNullable<
                        Section["banner"]
                      >["animation"],
                    },
                  })
                }
              >
                <option value="none">Без анимации</option>
                <option value="fade">Плавное появление</option>
                <option value="slide">Сдвиг</option>
                <option value="zoom">Приближение</option>
              </select>
            </label>
          </div>
          <p className="muted">
            Используйте поля секции, загрузку фото/видео и слайды ниже.
            Автовоспроизведение отключено; при уменьшении движения в настройках
            устройства анимация отключается.
          </p>
        </fieldset>
      )}
      <label>
        Текст / подзаголовок
        <textarea
          value={section.subtitle}
          maxLength={5000}
          rows={4}
          onChange={(e) => onChange({ subtitle: e.target.value })}
        />
      </label>
      <fieldset>
        <legend>Оформление</legend>
        <div className="editor-fields">
          <label>
            Шрифт
            <select
              value={section.font}
              onChange={(e) => onChange({ font: e.target.value as Font })}
            >
              {fonts.map((font) => (
                <option key={font}>{font}</option>
              ))}
            </select>
          </label>
          <label>
            Цвет текста
            <input
              type="color"
              value={section.color}
              onChange={(e) => onChange({ color: e.target.value })}
            />
          </label>
          <label>
            Цвет фона
            <input
              type="color"
              value={section.background}
              onChange={(e) => onChange({ background: e.target.value })}
            />
          </label>
        </div>
        <div className="editor-fields">
          <label>
            Яркость: {section.brightness}%
            <input
              type="range"
              min={30}
              max={150}
              value={section.brightness}
              onChange={(e) => onChange({ brightness: Number(e.target.value) })}
            />
          </label>
          <label>
            Насыщенность: {section.saturation}%
            <input
              type="range"
              min={0}
              max={200}
              value={section.saturation}
              onChange={(e) => onChange({ saturation: Number(e.target.value) })}
            />
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Медиа секции</legend>
        <label>
          Ссылка на изображение
          <input
            value={section.image}
            maxLength={1000}
            onChange={(e) => onChange({ image: e.target.value })}
            placeholder="/media/… или https://…"
          />
        </label>
        <label className="upload-label">
          <Upload size={17} />
          {uploading
            ? "Загружаем…"
            : `Загрузить фото (до ${uploadLimits?.image_mb ?? "…"} МБ)`}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file, "image");
              e.target.value = "";
            }}
          />
        </label>
        <label>
          Ссылка на видео
          <input
            value={section.video}
            maxLength={1000}
            onChange={(e) => onChange({ video: e.target.value })}
          />
        </label>
        <label className="upload-label">
          <Upload size={17} />
          {`Загрузить видео (до ${uploadLimits?.video_mb ?? "…"} МБ)`}
          <input
            type="file"
            accept="video/mp4,video/webm"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file, "video");
              e.target.value = "";
            }}
          />
        </label>
        {section.image && (
          <img
            className="editor-media-preview"
            src={section.image}
            alt="Предпросмотр изображения секции"
            style={{
              filter: `brightness(${section.brightness}%) saturate(${section.saturation}%)`,
            }}
          />
        )}
      </fieldset>
      {!["text", "image", "video", "contact", "about"].includes(
        section.type,
      ) && (
        <fieldset>
          <legend>
            {section.type === "hero" ? "Баннеры слайдера" : "Элементы секции"}
          </legend>
          {section.items.map((item, index) => (
            <details className="item-editor" key={item.id}>
              <summary>
                {index + 1}. {item.title || "Новый элемент"}
              </summary>
              <label>
                Название
                <input
                  value={item.title}
                  maxLength={200}
                  onChange={(e) => patchItem(index, { title: e.target.value })}
                />
              </label>
              <label>
                Описание
                <textarea
                  rows={2}
                  maxLength={2000}
                  value={item.text}
                  onChange={(e) => patchItem(index, { text: e.target.value })}
                />
              </label>
              {section.type === "catalog" ? (
                <ProductEditor
                  item={item}
                  onChange={(patch) => patchItem(index, patch)}
                  onUpload={(file, imageId) =>
                    onUpload(file, "image", index, imageId)
                  }
                  onPromoUpload={(file) => onUpload(file, "promo", index)}
                  uploading={uploading}
                />
              ) : (
                <>
                  <label>
                    Изображение
                    <input
                      value={item.image}
                      maxLength={1000}
                      onChange={(e) =>
                        patchItem(index, { image: e.target.value })
                      }
                    />
                  </label>
                  <label className="upload-label">
                    <Image size={17} />
                    Загрузить изображение
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onUpload(file, "image", index);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </>
              )}
              <div className="editor-fields">
                <label>
                  Категория
                  <input
                    value={item.category}
                    maxLength={100}
                    onChange={(e) =>
                      patchItem(index, { category: e.target.value })
                    }
                  />
                </label>
                <label>
                  Метка
                  <input
                    value={item.tag}
                    maxLength={100}
                    onChange={(e) => patchItem(index, { tag: e.target.value })}
                  />
                </label>
                {section.type === "catalog" && (
                  <label>
                    Цена, ₸
                    <input
                      type="number"
                      min={0}
                      max={99999999}
                      step="0.01"
                      value={item.price}
                      onChange={(e) =>
                        patchItem(index, { price: e.target.value })
                      }
                    />
                  </label>
                )}
              </div>
              <button
                className="danger-button"
                onClick={() =>
                  onChange({
                    items: section.items.filter((_, i) => i !== index),
                  })
                }
              >
                <Trash2 size={16} />
                Удалить элемент
              </button>
            </details>
          ))}
          <button
            className="button outline"
            disabled={section.items.length >= 100}
            onClick={() =>
              onChange({
                items: [
                  ...section.items,
                  {
                    id: crypto.randomUUID(),
                    title: "Новый элемент",
                    text: "",
                    image: "",
                    category: "",
                    price: 0,
                    tag: "",
                  },
                ],
              })
            }
          >
            <Plus size={16} />
            Добавить элемент
          </button>
        </fieldset>
      )}
    </div>
  );
}
