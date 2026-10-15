import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type SetStateAction,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Blocks,
  Check,
  Eye,
  FileText,
  Image,
  LayoutTemplate,
  LogOut,
  Plus,
  Save,
  Send,
  Settings2,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import {
  authSlice,
  contentApi,
  errorMessage,
  useCsrfQuery,
  useDraftQuery,
  useLeadsQuery,
  useLoginMutation,
  useLogoutMutation,
  usePublishMutation,
  useSaveMutation,
  useUploadMutation,
  useConfigQuery,
} from "../store/api";
import {
  moveSection,
  patchSectionContent,
  newSection,
  type ContentItem,
  type Font,
  type Section,
  type SectionType,
  type SiteDocument,
} from "../domain/content";
import { PublicSite } from "./PublicSite";
import { validateDocument } from "../domain/validation";
import { ProductEditor } from "../components/ProductEditor";
import { SeoEditor } from "../components/SeoEditor";
import { productImages, withProductImages } from "../domain/products";
import {
  localizedDocument,
  withLocalizedDocument,
  type Language,
} from "../i18n";

const sectionNames: Record<SectionType, string> = {
  hero: "Главный баннер",
  features: "Преимущества",
  catalog: "Продукция",
  projects: "Портфолио",
  consultation: "Консультация",
  about: "О компании",
  news: "Статьи",
  contact: "Контактная секция",
  text: "Текст",
  image: "Фото",
  video: "Видео",
};
const fonts: Font[] = ["Open Sans", "Arial", "Georgia"];

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const dispatch = useDispatch();
  const { isSuccess: csrfReady } = useCsrfQuery();
  const [login, { isLoading }] = useLoginMutation();
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const result = await login({
        username: String(data.get("username")),
        password: String(data.get("password")),
      }).unwrap();
      dispatch(authSlice.actions.setAccess(result.access));
      onSuccess();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  return (
    <div className="admin-login">
      <div className="login-card">
        <Blocks className="accent" size={40} />
        <span className="eyebrow">TerraKlink Admin</span>
        <h1>Вход для редактора</h1>
        <p className="muted">Редактируйте содержание и оформление страниц.</p>
        <form onSubmit={submit}>
          <label>
            Логин
            <input name="username" required autoComplete="username" />
          </label>
          <label>
            Пароль
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <button className="button" disabled={isLoading || !csrfReady}>
            {isLoading ? "Входим…" : "Войти"}
            <ArrowUpRight size={18} />
          </button>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
        <Link to="/">← Вернуться на сайт</Link>
      </div>
    </div>
  );
}

function LeadsPanel() {
  const { data, isLoading, isError } = useLeadsQuery();
  return (
    <div className="editor-card">
      <h2>Заявки с сайта</h2>
      <p className="muted">
        Последние 200 заявок. Изменить статус можно в{" "}
        <a href="/django-admin/cms/lead/">TerraKlink Admin</a>.
      </p>
      {isLoading && <p>Загружаем заявки…</p>}
      {isError && <p className="error">Не удалось загрузить заявки.</p>}
      {data?.length === 0 && <p>Заявок пока нет.</p>}
      {!!data?.length && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Имя и телефон</th>
                <th>Регион</th>
                <th>Обращение</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {data.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    {new Date(lead.created_at).toLocaleString("ru-RU", {
                      timeZone: "Asia/Almaty",
                    })}
                  </td>
                  <td>
                    {lead.name}
                    <br />
                    {lead.phone}
                  </td>
                  <td>{lead.region || "Не выбран"}</td>
                  <td>{lead.message}</td>
                  <td>{lead.status === "new" ? "Новая" : "Обработана"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SectionEditor({
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

export function Admin() {
  useEffect(() => {
    window.document.title = "TerraKlink Admin";
    const robots = window.document.head.querySelector<HTMLMetaElement>(
      'meta[name="robots"]',
    );
    if (robots) robots.content = "noindex, nofollow";
    window.document.head
      .querySelectorAll('link[rel="canonical"], link[hreflang], #site-schema')
      .forEach((element) => element.remove());
  }, []);
  const { data: config } = useConfigQuery();
  const dispatch = useDispatch();
  const access = useSelector(
    (state: { auth: { access: string } }) => state.auth.access,
  );
  const [loggedIn, setLoggedIn] = useState(!!access);
  const {
    data,
    error: draftError,
    refetch,
  } = useDraftQuery(undefined, {
    skip: !loggedIn,
    refetchOnMountOrArgChange: true,
  });
  const [siteDocument, setSiteDocument] = useState<SiteDocument | null>(null);
  const [editingLanguage, setEditingLanguage] = useState<Language>("ru");
  const document = siteDocument
    ? localizedDocument(siteDocument, editingLanguage)
    : null;
  const setDocument = (next: SetStateAction<SiteDocument | null>) => {
    setSiteDocument((current) => {
      const localized = current
        ? localizedDocument(current, editingLanguage)
        : null;
      const value = typeof next === "function" ? next(localized) : next;
      return current && value
        ? withLocalizedDocument(current, value, editingLanguage)
        : value;
    });
  };
  const [revision, setRevision] = useState(0);
  const [publishedRevision, setPublishedRevision] = useState(0);
  const [selectedId, setSelectedId] = useState("hero");
  const [tab, setTab] = useState<"sections" | "settings" | "leads">("sections");
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const [addType, setAddType] = useState<SectionType>("text");
  const [save, { isLoading: saving }] = useSaveMutation();
  const [publish, { isLoading: publishing }] = usePublishMutation();
  const [upload, { isLoading: uploading }] = useUploadMutation();
  const [logout] = useLogoutMutation();
  const lastServerRevision = useRef(0);
  useEffect(() => {
    // Cached snapshots can arrive after a save; never roll the editor back.
    if (data && data.revision > lastServerRevision.current && !dirty) {
      setSiteDocument(structuredClone(data.document));
      setRevision(data.revision);
      setPublishedRevision(data.published_revision ?? 0);
      lastServerRevision.current = data.revision;
    }
  }, [data, dirty]);
  useEffect(() => {
    if (
      document &&
      !document.sections.some((section) => section.id === selectedId)
    )
      setSelectedId(document.sections[0]?.id ?? "");
  }, [document, selectedId]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  if (!loggedIn)
    return (
      <Login
        onSuccess={() => {
          setLoggedIn(true);
          dispatch(contentApi.util.resetApiState());
        }}
      />
    );
  if (!document)
    return (
      <div className="load-screen">
        {draftError ? (
          <>
            <p>{errorMessage(draftError)}</p>
            <button
              className="button"
              onClick={() => {
                setLoggedIn(false);
              }}
            >
              Вернуться ко входу
            </button>
          </>
        ) : (
          "Загружаем редактор…"
        )}
      </div>
    );
  const selected = document.sections.find(
    (section) => section.id === selectedId,
  );
  const busy = saving || publishing || uploading || reloading;
  const edit = (next: SiteDocument) => {
    setDocument(next);
    setDirty(true);
    setNotice("");
    setFailure("");
  };
  const patchSection = (id: string, patch: Partial<Section>) =>
    edit({
      ...document,
      sections: document.sections.map((section) =>
        section.id === id ? patchSectionContent(section, patch) : section,
      ),
    });
  const saveDraft = async () => {
    setFailure("");
    const errors = validateDocument(siteDocument!);
    if (errors.length) throw { status: 400, data: errors };
    const result = await save({ revision, document: siteDocument! }).unwrap();
    setSiteDocument(structuredClone(result.document));
    setRevision(result.revision);
    setPublishedRevision(result.published_revision ?? 0);
    setDirty(false);
    lastServerRevision.current = result.revision;
    return result.revision;
  };
  const saveClick = async () => {
    try {
      await saveDraft();
      setNotice("Черновик сохранён. Посетители видят опубликованную версию.");
    } catch (err) {
      setFailure(errorMessage(err));
    }
  };
  const publishClick = async () => {
    try {
      const errors = validateDocument(siteDocument!);
      if (errors.length) throw { status: 400, data: errors };
      const current = dirty ? await saveDraft() : revision;
      const result = await publish({ revision: current }).unwrap();
      setRevision(result.revision);
      setPublishedRevision(result.published_revision ?? 0);
      lastServerRevision.current = result.revision;
      setNotice("Изменения опубликованы на сайте.");
    } catch (err) {
      setFailure(errorMessage(err));
    }
  };
  const uploadFile = async (
    file: File,
    target: "image" | "video" | "promo",
    itemIndex?: number,
    imageId?: string,
  ) => {
    if (!selected) return;
    if (!config) {
      setFailure(
        "Не удалось загрузить ограничения загрузки. Обновите страницу.",
      );
      return;
    }
    const maxSize =
      config.upload_limits[target === "video" ? "video_mb" : "image_mb"];
    if (file.size > maxSize * 1024 * 1024) {
      setFailure(`Файл должен быть не больше ${maxSize} МБ.`);
      return;
    }
    const id = selected.id;
    const itemId =
      itemIndex === undefined ? undefined : selected.items[itemIndex]?.id;
    const body = new FormData();
    body.append("file", file);
    try {
      const result = await upload(body).unwrap();
      // A user may switch sections while uploading: attach to the originating section.
      setDocument((current) => {
        if (!current) return current;
        return {
          ...current,
          sections: current.sections.map((section) =>
            section.id !== id
              ? section
              : itemIndex === undefined
                ? patchSectionContent(section, { [target]: result.url })
                : patchSectionContent(section, {
                    items: section.items.map((item) =>
                      item.id !== itemId
                        ? item
                        : target === "promo"
                          ? {
                              ...item,
                              promo: item.promo
                                ? { ...item.promo, image: result.url }
                                : item.promo,
                            }
                          : imageId
                            ? withProductImages(
                                item,
                                productImages(item).map((image) =>
                                  image.id === imageId
                                    ? { ...image, url: result.url }
                                    : image,
                                ),
                              )
                            : { ...item, image: result.url },
                    ),
                  }),
          ),
        };
      });
      setDirty(true);
      setNotice("Файл загружен. Сохраните черновик или опубликуйте изменения.");
    } catch (err) {
      setFailure(errorMessage(err));
    }
  };
  const deleteSection = () => {
    if (!selected || document.sections.length <= 1) return;
    const remaining = document.sections.filter(
      (section) => section.id !== selected.id,
    );
    edit({ ...document, sections: remaining });
    setSelectedId(remaining[0].id);
  };
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" to="/">
          <Blocks size={30} />
          <strong>TerraKlink Admin</strong>
        </Link>
        <div className="admin-caption">ПАНЕЛЬ УПРАВЛЕНИЯ</div>
        <button
          className={tab === "sections" ? "active" : ""}
          onClick={() => setTab("sections")}
        >
          <LayoutTemplate size={19} />
          Страница и секции
        </button>
        <button
          className={tab === "settings" ? "active" : ""}
          onClick={() => setTab("settings")}
        >
          <Settings2 size={19} />
          Оформление и контакты
        </button>
        <button
          className={tab === "leads" ? "active" : ""}
          onClick={() => setTab("leads")}
        >
          <Users size={19} />
          Заявки
        </button>
        <a href="/django-admin/" target="_blank">
          <FileText size={19} />
          История и пользователи
        </a>
        <Link to="/analytics">Аналитика</Link>
        <Link to="/management">Управление</Link>
        <div className="admin-sidebar-bottom">
          <Link to="/" target="_blank">
            Открыть сайт
            <ArrowUpRight size={16} />
          </Link>
          <button
            onClick={async () => {
              await logout();
              dispatch(authSlice.actions.setAccess(""));
              dispatch(contentApi.util.resetApiState());
              setLoggedIn(false);
              setDocument(null);
              setEditingLanguage("ru");
              setDirty(false);
              setPreview(false);
              setNotice("");
              setFailure("");
              setSelectedId("hero");
              setTab("sections");
              lastServerRevision.current = 0;
            }}
          >
            <LogOut size={17} />
            Выйти
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-toolbar">
          <div>
            <span className="eyebrow">СОДЕРЖАНИЕ САЙТА</span>
            <h1>
              {tab === "leads"
                ? "Заявки"
                : tab === "settings"
                  ? "Настройки сайта"
                  : "Редактор главной страницы"}
            </h1>
          </div>
          <div className="toolbar-actions">
            <label className="editor-language">
              Язык контента
              <select
                value={editingLanguage}
                disabled={busy}
                onChange={(event) => {
                  const language = event.target.value as Language;
                  if (language === "kk" && !siteDocument?.translations?.kk) {
                    setSiteDocument((current) =>
                      current
                        ? withLocalizedDocument(
                            current,
                            localizedDocument(current, "kk"),
                            "kk",
                          )
                        : current,
                    );
                    setDirty(true);
                    setNotice(
                      "Создан казахский черновик. Проверьте перевод и изображения перед публикацией.",
                    );
                  }
                  setEditingLanguage(language);
                }}
              >
                <option value="ru">Русский</option>
                <option value="kk">Қазақша</option>
              </select>
            </label>
            <span className={`save-status ${dirty ? "unsaved" : ""}`}>
              <span />
              {dirty ? "Есть изменения" : "Сохранено"}
            </span>
            <button
              className="button outline"
              onClick={() => setPreview(!preview)}
            >
              <Eye size={17} />
              {preview ? "В редактор" : "Предпросмотр"}
            </button>
            <button
              className="button outline"
              disabled={!dirty || busy}
              onClick={saveClick}
            >
              <Save size={17} />
              Сохранить
            </button>
            <button className="button" disabled={busy} onClick={publishClick}>
              <Send size={17} />
              Опубликовать
            </button>
          </div>
        </header>
        <div className="admin-content" inert={busy}>
          <div className="revision-line">
            <span>Черновик · версия {revision}</span>
            <span>Опубликовано · версия {publishedRevision}</span>
          </div>
          {notice && (
            <p className="notice" role="status">
              <Check size={18} />
              {notice}
            </p>
          )}
          {failure && (
            <div className="error" role="alert">
              <p>{failure}</p>
              <button
                className="text-button"
                onClick={async () => {
                  setReloading(true);
                  try {
                    // Only replace local edits after the server returned a fresh snapshot.
                    const result = await refetch().unwrap();
                    setSiteDocument(structuredClone(result.document));
                    setRevision(result.revision);
                    setPublishedRevision(result.published_revision ?? 0);
                    lastServerRevision.current = result.revision;
                    setDirty(false);
                    setNotice("");
                    setFailure("");
                  } catch (err) {
                    setFailure(errorMessage(err));
                  } finally {
                    setReloading(false);
                  }
                }}
              >
                Загрузить серверную версию (сбросить локальные изменения)
              </button>
            </div>
          )}
          {preview ? (
            <div className="admin-preview">
              <div className="preview-label">
                Предпросмотр текущего черновика
              </div>
              <PublicSite
                previewDocument={siteDocument!}
                previewLanguage={editingLanguage}
              />
            </div>
          ) : tab === "leads" ? (
            <LeadsPanel />
          ) : tab === "settings" ? (
            <div className="editor-card">
              <h2>Общее оформление</h2>
              <div className="editor-fields">
                <label>
                  Акцентный цвет
                  <input
                    type="color"
                    value={document.theme.accent}
                    onChange={(e) =>
                      edit({
                        ...document,
                        theme: { ...document.theme, accent: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  Основной шрифт
                  <select
                    value={document.theme.font}
                    onChange={(e) =>
                      edit({
                        ...document,
                        theme: {
                          ...document.theme,
                          font: e.target.value as Font,
                        },
                      })
                    }
                  >
                    {fonts.map((font) => (
                      <option key={font}>{font}</option>
                    ))}
                  </select>
                </label>
              </div>
              <h2>Данные компании</h2>
              {(["name", "phone", "email", "address"] as const).map(
                (key, i) => (
                  <label key={key}>
                    {["Название", "Телефон", "Email", "Адрес"][i]}
                    <input
                      type={key === "email" ? "email" : "text"}
                      required
                      maxLength={
                        key === "address"
                          ? 300
                          : key === "phone"
                            ? 50
                            : key === "email"
                              ? 254
                              : 100
                      }
                      value={document.company[key]}
                      onChange={(e) =>
                        edit({
                          ...document,
                          company: {
                            ...document.company,
                            [key]: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                ),
              )}
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={document.company.demo}
                  onChange={(e) =>
                    edit({
                      ...document,
                      company: { ...document.company, demo: e.target.checked },
                    })
                  }
                />
                Показывать отметку о демонстрационных данных
              </label>
              <p className="muted">
                Перед отключением отметки замените контакты, баннеры и
                материалы, утвердите юридические документы.
              </p>
              <SeoEditor
                value={document.seo ?? {}}
                shared={editingLanguage === "ru"}
                onChange={(seo) => edit({ ...document, seo })}
              />
            </div>
          ) : (
            <div className="editor-layout">
              <div className="section-list">
                <div className="section-list-heading">
                  <h2>Секции</h2>
                  <span>{document.sections.length}</span>
                </div>
                <p className="muted">Порядок соответствует главной странице</p>
                {document.sections.map((section, index) => (
                  <div
                    className={`section-row ${section.id === selectedId ? "selected" : ""}`}
                    key={section.id}
                  >
                    <button onClick={() => setSelectedId(section.id)}>
                      <span className="section-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>
                        <strong>
                          {section.title || sectionNames[section.type]}
                        </strong>
                        <small>
                          {sectionNames[section.type]}
                          {!section.visible && " · Скрыта"}
                        </small>
                      </span>
                    </button>
                    <div className="section-order">
                      <button
                        disabled={index === 0}
                        aria-label={`Поднять ${section.title}`}
                        onClick={() =>
                          edit({
                            ...document,
                            sections: moveSection(
                              document.sections,
                              section.id,
                              -1,
                            ),
                          })
                        }
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        disabled={index === document.sections.length - 1}
                        aria-label={`Опустить ${section.title}`}
                        onClick={() =>
                          edit({
                            ...document,
                            sections: moveSection(
                              document.sections,
                              section.id,
                              1,
                            ),
                          })
                        }
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="add-section">
                  <label>
                    Тип новой секции
                    <select
                      value={addType}
                      onChange={(e) =>
                        setAddType(e.target.value as SectionType)
                      }
                    >
                      {Object.entries(sectionNames).map(([key, name]) => (
                        <option value={key} key={key}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="button outline"
                    disabled={document.sections.length >= 40}
                    onClick={() => {
                      const section = newSection(addType);
                      edit({
                        ...document,
                        sections: [...document.sections, section],
                      });
                      setSelectedId(section.id);
                    }}
                  >
                    <Plus size={17} />
                    Добавить секцию
                  </button>
                </div>
              </div>
              <div>
                {selected && (
                  <SectionEditor
                    uploadLimits={config?.upload_limits}
                    section={selected}
                    onChange={(patch) => patchSection(selected.id, patch)}
                    onUpload={uploadFile}
                    uploading={uploading}
                  />
                )}
                <button
                  className="danger-button delete-section"
                  disabled={document.sections.length <= 1}
                  onClick={deleteSection}
                >
                  <Trash2 size={17} />
                  Удалить выбранную секцию
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
