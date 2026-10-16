import { useEffect, useRef, useState, type SetStateAction } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Blocks,
  Check,
  Eye,
  FileText,
  LayoutTemplate,
  LogOut,
  Plus,
  Save,
  Send,
  Settings2,
  Trash2,
  Users,
} from "lucide-react";
import {
  authSlice,
  contentApi,
  errorMessage,
  useDraftQuery,
  useLogoutMutation,
  usePublishMutation,
  useSaveMutation,
  useUploadMutation,
  useConfigQuery,
} from "../store/api";
import {
  patchSectionContent,
  newSection,
  type Font,
  type Section,
  type SectionType,
  type SiteDocument,
} from "../domain/content";
import { PublicSite } from "./PublicSite";
import { validateDocument } from "../domain/validation";
import { Login } from "../features/auth/Login";
import { LeadsPanel } from "../features/editor/LeadsPanel";
import { SectionEditor } from "../features/editor/SectionEditor";
import { SectionList } from "../features/editor/SectionList";
import { sectionNames, fonts } from "../features/editor/config";
import { SeoEditor } from "../components/SeoEditor";
import { withRecommendedDefaults } from "../domain/defaults";
import { productImages, withProductImages } from "../domain/products";
import {
  localizedDocument,
  withLocalizedDocument,
  type Language,
} from "../i18n";

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
      const initialized = withRecommendedDefaults(data.document);
      setSiteDocument(initialized);
      if (JSON.stringify(initialized) !== JSON.stringify(data.document)) {
        setDirty(true);
        setNotice(
          "Пустые SEO/GEO-поля заполнены стартовыми значениями. Проверьте их и сохраните черновик.",
        );
      }
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
                <SectionList
                  sections={document.sections}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onChange={(sections) => edit({ ...document, sections })}
                />
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
