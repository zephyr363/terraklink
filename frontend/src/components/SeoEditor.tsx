import type { SeoSettings } from "../domain/content";

const pages = [
  ["/", "Главная"],
  ["/catalog", "Каталог"],
  ["/about", "О заводе"],
  ["/projects", "Портфолио"],
  ["/information", "Информация"],
  ["/dealers", "Где купить"],
  ["/contacts", "Контакты"],
];

export function SeoEditor({
  value,
  shared,
  onChange,
}: {
  value: SeoSettings;
  shared: boolean;
  onChange: (value: SeoSettings) => void;
}) {
  const patch = (next: Partial<SeoSettings>) => onChange({ ...value, ...next });
  const text = (key: keyof SeoSettings, label: string, max = 300) => (
    <label key={key}>
      {label}
      <input
        maxLength={max}
        value={String(value[key] ?? "")}
        onChange={(e) => patch({ [key]: e.target.value })}
      />
    </label>
  );
  return (
    <fieldset className="seo-editor">
      <legend>SEO и GEO — поиск и узнаваемость</legend>
      <p className="muted">
        Тексты заполняются отдельно для русского и казахского языков. Общие
        параметры домена и индексации меняются в русской версии. Поисковые
        системы самостоятельно выбирают сроки индексации и место в выдаче.
      </p>
      {shared && (
        <>
          {text("site_url", "Публичный HTTPS-адрес сайта")}
          <label className="checkbox">
            <input
              type="checkbox"
              checked={value.indexing ?? false}
              onChange={(e) => patch({ indexing: e.target.checked })}
            />
            Разрешить индексацию
          </label>
          <p className="muted">
            Индексация включится только после указания домена и отключения
            демонстрационных данных.
          </p>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={value.structured_data ?? true}
              onChange={(e) => patch({ structured_data: e.target.checked })}
            />
            Структурированные данные о компании и товарах
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={value.ai_enabled ?? true}
              onChange={(e) => patch({ ai_enabled: e.target.checked })}
            />
            Публиковать справку о бренде в llms.txt
          </label>
          {text(
            "google_verification",
            "Код подтверждения Google Search Console",
            150,
          )}
          {text(
            "yandex_verification",
            "Код подтверждения Яндекс Вебмастера",
            150,
          )}
        </>
      )}
      {text("title", "SEO-заголовок главной", 120)}
      <label>
        SEO-описание по умолчанию
        <textarea
          maxLength={320}
          value={value.description ?? ""}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </label>
      {text("og_image", "Изображение для социальных сетей (URL)", 1000)}
      {text("logo", "Логотип компании (URL)", 1000)}
      {text("legal_name", "Юридическое название", 200)}
      <div className="editor-fields">
        {text("city", "Город", 100)}
        {text("region", "Область", 100)}
        {text("postal_code", "Почтовый индекс", 20)}
      </div>
      <div className="editor-fields">
        {(["latitude", "longitude"] as const).map((key) => (
          <label key={key}>
            {key === "latitude" ? "Широта" : "Долгота"}
            <input
              type="number"
              step="any"
              min={key === "latitude" ? -90 : -180}
              max={key === "latitude" ? 90 : 180}
              value={value[key] ?? ""}
              onChange={(e) =>
                patch({
                  [key]: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </label>
        ))}
      </div>
      <label>
        Регионы обслуживания (по одному в строке)
        <textarea
          value={(value.areas_served ?? []).join("\n")}
          onChange={(e) => patch({ areas_served: e.target.value.split("\n") })}
          onBlur={() =>
            patch({
              areas_served: (value.areas_served ?? [])
                .map((row) => row.trim())
                .filter(Boolean),
            })
          }
        />
      </label>
      <label>
        Официальные профили компании (HTTPS, по одному в строке)
        <textarea
          value={(value.same_as ?? []).join("\n")}
          onChange={(e) => patch({ same_as: e.target.value.split("\n") })}
          onBlur={() =>
            patch({
              same_as: (value.same_as ?? [])
                .map((row) => row.trim())
                .filter(Boolean),
            })
          }
        />
      </label>
      <label>
        Справка о бренде для ИИ-поиска
        <textarea
          rows={5}
          maxLength={4000}
          value={value.ai_summary ?? ""}
          onChange={(e) => patch({ ai_summary: e.target.value })}
        />
      </label>
      <p className="muted">
        Укажите факты о продукции, географии и компании. Эта справка
        показывается на главной; llms.txt — дополнительный экспериментальный
        формат, который не гарантирует упоминаний в ИИ-ответах.
      </p>
      <details>
        <summary>SEO отдельных страниц</summary>
        {pages.map(([path, title]) => (
          <fieldset key={path}>
            <legend>{title}</legend>
            <label>
              Заголовок страницы
              <input
                maxLength={120}
                value={value.pages?.[path]?.title ?? ""}
                onChange={(e) =>
                  patch({
                    pages: {
                      ...value.pages,
                      [path]: { ...value.pages?.[path], title: e.target.value },
                    },
                  })
                }
              />
            </label>
            <label>
              Описание страницы
              <textarea
                maxLength={320}
                value={value.pages?.[path]?.description ?? ""}
                onChange={(e) =>
                  patch({
                    pages: {
                      ...value.pages,
                      [path]: {
                        ...value.pages?.[path],
                        description: e.target.value,
                      },
                    },
                  })
                }
              />
            </label>
          </fieldset>
        ))}
      </details>
      <h3>Вопросы и ответы на главной</h3>
      {(value.faq ?? []).map((row, index) => (
        <fieldset key={index}>
          <legend>Вопрос {index + 1}</legend>
          <label>
            Вопрос
            <input
              maxLength={200}
              value={row.question}
              onChange={(e) =>
                patch({
                  faq: value.faq!.map((q, i) =>
                    i === index ? { ...q, question: e.target.value } : q,
                  ),
                })
              }
            />
          </label>
          <label>
            Ответ
            <textarea
              maxLength={2000}
              value={row.answer}
              onChange={(e) =>
                patch({
                  faq: value.faq!.map((q, i) =>
                    i === index ? { ...q, answer: e.target.value } : q,
                  ),
                })
              }
            />
          </label>
          <button
            className="danger-button"
            onClick={() =>
              patch({ faq: value.faq!.filter((_, i) => i !== index) })
            }
          >
            Удалить вопрос
          </button>
        </fieldset>
      ))}
      <button
        className="button outline"
        disabled={(value.faq?.length ?? 0) >= 20}
        onClick={() =>
          patch({ faq: [...(value.faq ?? []), { question: "", answer: "" }] })
        }
      >
        Добавить вопрос
      </button>
    </fieldset>
  );
}
