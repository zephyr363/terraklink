import {
  LanguageContext,
  localizedDocument,
  useSiteLanguage,
  useTranslation,
  type Language,
} from "../i18n";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LocalizedLink as Link,
  LocalizedNavLink as NavLink,
  languageHref,
} from "../i18n/navigation";
import { ProductGallery } from "../components/ProductGallery";
import { ProductPrice } from "../components/ProductPrice";
import { activePromo } from "../domain/products";
import { filterProducts, type CatalogFilter } from "../domain/catalog";
import { Seo } from "../components/Seo";
import { AnalyticsTracker } from "../components/AnalyticsTracker";
import {
  ArrowRight,
  Blocks,
  ChevronDown,
  Mail,
  MapPin,
  Menu,
  Phone,
  Search,
  X,
} from "lucide-react";
import type { ContentItem, SiteDocument } from "../domain/content";
import { usePublicContentQuery } from "../store/api";
import { SectionRenderer, ProductCard } from "../components/SectionRenderer";
import { CookieBanner, RegionDialog } from "../components/Privacy";
import { Dialog } from "../components/Dialog";
import { LeadForm } from "../components/LeadForm";
import { LegalPage } from "./legal";

function Brand({ name }: { name: string }) {
  const { t } = useTranslation();
  return (
    <Link to="/" className="brand" aria-label={`${name} — ${t("Главная")}`}>
      <Blocks size={49} strokeWidth={1.7} />
      <span>
        <strong>{name}</strong>
        <small>{t("КИРПИЧНЫЙ ЗАВОД")}</small>
      </span>
    </Link>
  );
}

export function PublicSite({
  previewDocument,
  previewLanguage,
}: {
  previewDocument?: SiteDocument;
  previewLanguage?: Language;
}) {
  const { language, setLanguage, t } = useSiteLanguage(previewLanguage);
  const { data, isLoading, isError, refetch } = usePublicContentQuery(
    undefined,
    { skip: !!previewDocument },
  );
  const sourceDocument = previewDocument ?? data?.document;
  const document = sourceDocument
    ? localizedDocument(sourceDocument, language)
    : undefined;
  const location = useLocation();
  const navigate = useNavigate();
  const firstNavigation = useRef(true);
  useEffect(() => {
    if (previewDocument) return;
    const requested = new URLSearchParams(location.search).get("lang");
    if (firstNavigation.current) {
      firstNavigation.current = false;
      if (!requested && language === "kk") {
        navigate(languageHref(location.pathname + location.search, "kk"), {
          replace: true,
        });
        return;
      }
    }
    setLanguage(requested === "kk" ? "kk" : "ru");
  }, [location.pathname, location.search]);
  const [previewUrl, setPreviewUrl] = useState("/");
  const currentUrl = previewDocument
    ? new URL(previewUrl, window.location.origin)
    : location;
  const [region, setRegion] = useState(() => {
    try {
      return localStorage.getItem("tk-region") || "";
    } catch {
      return "";
    }
  });
  const [regionOpen, setRegionOpen] = useState(false);
  const [cookiesOpen, setCookiesOpen] = useState(false);
  const [callback, setCallback] = useState(false);
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [project, setProject] = useState<ContentItem | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Все");
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [catalogFilter, setCatalogFilter] = useState<
    Omit<CatalogFilter, "search" | "category">
  >({ min: "", max: "", promoOnly: false, sort: "default" });
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
    setMenuOpen(false);
    setCategory(
      new URLSearchParams(currentUrl.search).get("collection") === "taiga"
        ? t("Коллекция Тайга")
        : "Все",
    );
  }, [currentUrl.pathname, currentUrl.search, language]);
  if (!document)
    return (
      <div className="load-screen">
        {isLoading ? (
          t("Загружаем сайт…")
        ) : isError ? (
          <>
            <h1>{t("Сайт временно недоступен")}</h1>
            <p>{t("Не удалось загрузить опубликованный контент.")}</p>
            <button className="button" onClick={() => refetch()}>
              {t("Повторить")}
            </button>
          </>
        ) : (
          t("Контент ещё не опубликован.")
        )}
      </div>
    );
  const company = document.company;
  const catalog = document.sections
    .filter((section) => section.type === "catalog" && section.visible)
    .flatMap((section) => section.items);
  const products = [
    ...new Map(catalog.map((item) => [item.id, item])).values(),
  ];
  const sections = document.sections.filter((section) => section.visible);
  const filteredProducts = filterProducts(products, {
    ...catalogFilter,
    search,
    category,
  });
  const comparedProducts = products.filter((item) =>
    comparedIds.includes(item.id),
  );
  const attributeNames = [
    ...new Set(
      comparedProducts.flatMap((item) =>
        (item.attributes ?? []).map((row) => row.name),
      ),
    ),
  ];
  const categories = [
    "Все",
    ...new Set(products.map((product) => product.category)),
  ];
  const page = currentUrl.pathname;
  const hero = sections.find((section) => section.type === "hero");
  const heroIndex = sections.findIndex((section) => section.id === hero?.id);
  const titleAfter =
    sections[heroIndex + 1]?.type === "features"
      ? sections[heroIndex + 1].id
      : hero?.id;
  const nav = [
    ["/", "Главная"],
    ["/catalog", "Каталог"],
    ["/about", "О заводе"],
    ["/projects", "Портфолио"],
    ["/information", "Информация"],
    ["/dealers", "Где купить"],
    ["/contacts", "Контакты"],
  ];
  const detailProduct = products.find((item) => page === `/catalog/${item.id}`);
  const detailPromo = detailProduct ? activePromo(detailProduct) : null;
  const title =
    detailProduct?.title ?? nav.find(([path]) => path === page)?.[1];
  const regionSelect = (city: string) => {
    setRegion(city);
    try {
      localStorage.setItem("tk-region", city);
    } catch {
      /* Browser privacy settings may disable persistence. */
    }
    setRegionOpen(false);
  };
  return (
    <LanguageContext.Provider value={{ language }}>
      {!previewDocument && <AnalyticsTracker />}
      <div
        lang={language}
        className="public-site"
        onClickCapture={(event) => {
          if (!(event.target instanceof Element)) return;
          const link = event.target.closest("a");
          const href = link?.getAttribute("href");
          if (!href?.startsWith("/") || href.startsWith("//")) return;
          if (!previewDocument) {
            link?.setAttribute("href", languageHref(href, language));
            return;
          }
          // Keep draft navigation inside the preview instead of unmounting the editor.
          event.preventDefault();
          event.stopPropagation();
          setPreviewUrl(href);
          setCallback(false);
          setSelected(null);
          setProject(null);
        }}
        style={
          {
            "--accent": document.theme.accent,
            fontFamily: `'${document.theme.font}', sans-serif`,
          } as CSSProperties
        }
      >
        {!previewDocument && <Seo path={page} language={language} />}
        <a className="skip-link" href="#main-content">
          {t("Перейти к содержимому")}
        </a>
        <header>
          <div className="top-strip">
            <div className="container">
              <Link to="/catalog?collection=taiga">{t("Коллекция Тайга")}</Link>
              <Link to="/catalog">{t("Подбор кирпича")}</Link>
              <Link to="/projects">{t("Портфолио")}</Link>
              <Link to="/information">{t("Библиотека материалов")}</Link>
              <Link to="/information">{t("Для архитекторов")}</Link>
            </div>
          </div>
          <div className="container main-header">
            <Brand name={company.name} />
            <label className="language-switch">
              <span className="visually-hidden">
                {language === "kk" ? "Сайт тілі" : "Язык сайта"}
              </span>
              <select
                value={language}
                onChange={(event) => {
                  setLanguage(event.target.value as Language);
                  if (!previewDocument)
                    navigate(
                      languageHref(
                        page + currentUrl.search,
                        event.target.value as Language,
                      ),
                      { replace: true },
                    );
                  setCategory("Все");
                  setSelected(null);
                  setProject(null);
                }}
              >
                <option value="ru">Русский</option>
                <option value="kk">Қазақша</option>
              </select>
            </label>
            <button
              className="region-button"
              onClick={() => setRegionOpen(true)}
            >
              <MapPin size={19} />
              {region ? t(region) : t("Выберите город")}
              <ChevronDown size={13} />
            </button>
            <div className="header-phone">
              <Phone size={17} />
              <div>
                <a
                  href={
                    company.demo
                      ? "/contacts"
                      : `tel:${company.phone.replace(/[^+\d]/g, "")}`
                  }
                >
                  {company.phone}
                </a>
                <small>{t("Отдел продаж · Пн–Пт, 9:00–18:00")}</small>
              </div>
            </div>
            <button
              className="button outline"
              onClick={() => setCallback(true)}
            >
              {t("Заказать звонок")}
            </button>
            <button className="button" onClick={() => setCallback(true)}>
              {t("Заказать")}
            </button>
            <button
              className="icon-button mobile-menu"
              aria-label={t("Открыть меню")}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
          <nav
            className={`container main-nav ${menuOpen ? "is-open" : ""}`}
            aria-label={t("Главная навигация")}
          >
            {nav.map(([path, label]) => (
              <NavLink
                to={path}
                end={path === "/"}
                key={path}
                className={
                  previewDocument ? (page === path ? "active" : "") : undefined
                }
              >
                {t(label)}
                {[
                  "Главная",
                  "Каталог",
                  "О заводе",
                  "Информация",
                  "Где купить",
                ].includes(label) && <ChevronDown size={12} />}
              </NavLink>
            ))}
            <button
              className="icon-button"
              aria-label={t("Поиск по каталогу")}
              onClick={() => setSearchOpen(true)}
            >
              <Search size={22} />
            </button>
          </nav>
        </header>
        <main id="main-content">
          {page !== "/" && !page.startsWith("/legal/") && (
            <div className="page-heading container">
              <p className="breadcrumb">
                <Link to="/">{t("Главная")}</Link>
                <span>/</span>
                {t(title ?? "")}
              </p>
              <h1>{t(title ?? "Страница не найдена")}</h1>
            </div>
          )}
          {page === "/" &&
            sections.map((section) => (
              <Fragment key={section.id}>
                <SectionRenderer
                  section={section}
                  region={region}
                  onProduct={setSelected}
                  onProject={setProject}
                  preview={!!previewDocument}
                />
                {hero && section.id === titleAfter && (
                  <div
                    className="plant-title"
                    style={{
                      color: hero.color,
                      backgroundColor: hero.background,
                      fontFamily: `'${hero.font}', sans-serif`,
                    }}
                  >
                    <div className="container">
                      <h1>{hero.title}</h1>
                    </div>
                  </div>
                )}
              </Fragment>
            ))}
          {page === "/" &&
            (document.seo?.ai_summary || document.seo?.faq?.length) && (
              <section className="container content-section brand-facts">
                <h2>{company.name}</h2>
                <p className="multiline">{document.seo.ai_summary}</p>
                {document.seo.faq?.map((row, index) => (
                  <details key={index}>
                    <summary>{row.question}</summary>
                    <p className="multiline">{row.answer}</p>
                  </details>
                ))}
              </section>
            )}
          {detailProduct && (
            <div className="container product-detail-page">
              <ProductGallery key={detailProduct.id} item={detailProduct} />
              <div>
                <span className="eyebrow">{detailProduct.category}</span>
                <p>
                  {t("Артикул:")} {detailProduct.id}
                </p>
                <p className="multiline">{detailProduct.text}</p>
                {detailPromo && (
                  <aside className="product-promo">
                    {detailPromo.image && (
                      <img
                        className="promo-image"
                        src={detailPromo.image}
                        alt={detailPromo.label}
                      />
                    )}
                    <h2>{detailPromo.label}</h2>
                    <p>{detailPromo.text}</p>
                  </aside>
                )}
                {!!detailProduct.attributes?.length && (
                  <>
                    <h2>{t("Характеристики")}</h2>
                    <dl>
                      {detailProduct.attributes.map((row) => (
                        <div key={row.name}>
                          <dt>{row.name}</dt>
                          <dd>{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </>
                )}
                <p className="detail-price">
                  <ProductPrice item={detailProduct} />
                </p>
                {company.demo && (
                  <p className="muted">
                    {t("Демонстрационная цена. Наличие и условия уточняются.")}
                  </p>
                )}
                <LeadForm
                  preview={!!previewDocument}
                  region={region}
                  subject={`${t("Заказ:")} ${detailProduct.title} (${detailProduct.id})`}
                />
                <Link className="text-button accent" to="/catalog">
                  {t("Перейти в каталог")}
                </Link>
              </div>
            </div>
          )}
          {page === "/catalog" && (
            <div className="container catalog-page">
              <div className="catalog-tools">
                <label className="search-field">
                  <Search size={18} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label={t("Поиск кирпича")}
                    placeholder={t("Название или артикул кирпича")}
                  />
                </label>
                <span className="muted">{t("Цены в тенге, за штуку")}</span>
              </div>
              <div
                className="filter-tabs"
                aria-label={t("Категория продукции")}
              >
                {categories.map((value) => (
                  <button
                    key={value}
                    className={category === value ? "selected" : ""}
                    onClick={() => setCategory(value)}
                  >
                    {t(value)}
                  </button>
                ))}
              </div>
              <div className="catalog-filters">
                <label>
                  {t("Цена от, ₸")}
                  <input
                    type="number"
                    min="0"
                    max="99999999"
                    step="0.01"
                    value={catalogFilter.min}
                    onChange={(e) =>
                      setCatalogFilter({
                        ...catalogFilter,
                        min: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  {t("Цена до, ₸")}
                  <input
                    type="number"
                    min="0"
                    max="99999999"
                    step="0.01"
                    value={catalogFilter.max}
                    onChange={(e) =>
                      setCatalogFilter({
                        ...catalogFilter,
                        max: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  {t("Сортировка")}
                  <select
                    value={catalogFilter.sort}
                    onChange={(e) =>
                      setCatalogFilter({
                        ...catalogFilter,
                        sort: e.target.value as CatalogFilter["sort"],
                      })
                    }
                  >
                    <option value="default">{t("По умолчанию")}</option>
                    <option value="price-asc">{t("Сначала дешевле")}</option>
                    <option value="price-desc">{t("Сначала дороже")}</option>
                    <option value="name">{t("По названию")}</option>
                  </select>
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={catalogFilter.promoOnly}
                    onChange={(e) =>
                      setCatalogFilter({
                        ...catalogFilter,
                        promoOnly: e.target.checked,
                      })
                    }
                  />
                  {t("Только акции")}
                </label>
                <button
                  className="text-button"
                  onClick={() => {
                    setCatalogFilter({
                      min: "",
                      max: "",
                      promoOnly: false,
                      sort: "default",
                    });
                    setSearch("");
                    setCategory("Все");
                  }}
                >
                  {t("Сбросить фильтры")}
                </button>
              </div>
              {catalogFilter.min &&
                catalogFilter.max &&
                Number(catalogFilter.min) > Number(catalogFilter.max) && (
                  <p role="alert">
                    {t("Минимальная цена больше максимальной.")}
                  </p>
                )}
              <p className="muted">
                {t("Найдено товаров:")} {filteredProducts.length}
              </p>
              {!!comparedProducts.length && (
                <section className="comparison">
                  <h2>{t("Сравнение товаров")}</h2>
                  <p>{t("Выберите до четырёх товаров для сравнения.")}</p>
                  <button
                    className="text-button"
                    onClick={() => setComparedIds([])}
                  >
                    {t("Очистить сравнение")}
                  </button>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>{t("Характеристики")}</th>
                          {comparedProducts.map((item) => (
                            <th key={item.id}>
                              {item.title}
                              <button
                                className="text-button"
                                aria-label={`${t("Убрать из сравнения")} ${item.title}`}
                                onClick={() =>
                                  setComparedIds(
                                    comparedIds.filter((id) => id !== item.id),
                                  )
                                }
                              >
                                ×
                              </button>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <th>{t("Цена, ₸")}</th>
                          {comparedProducts.map((item) => (
                            <td key={item.id}>
                              <ProductPrice item={item} />
                            </td>
                          ))}
                        </tr>
                        {attributeNames.map((name) => (
                          <tr key={name}>
                            <th>{name}</th>
                            {comparedProducts.map((item) => (
                              <td key={item.id}>
                                {item.attributes?.find(
                                  (row) => row.name === name,
                                )?.value ?? "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
              <div className="product-grid">
                {filteredProducts.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    onSelect={setSelected}
                    compared={comparedIds.includes(item.id)}
                    compareDisabled={
                      comparedProducts.length >= 4 &&
                      !comparedIds.includes(item.id)
                    }
                    onCompare={(item) =>
                      setComparedIds((ids) =>
                        ids.includes(item.id)
                          ? ids.filter((id) => id !== item.id)
                          : ids.length < 4
                            ? [...ids, item.id]
                            : ids,
                      )
                    }
                  />
                ))}
              </div>
              {!filteredProducts.length && (
                <p className="empty-state">
                  {t(
                    "Ничего не найдено. Попробуйте другое название или категорию.",
                  )}
                </p>
              )}
            </div>
          )}
          {page === "/projects" &&
            sections
              .filter((s) => s.type === "projects")
              .map((s) => (
                <SectionRenderer
                  key={s.id}
                  section={s}
                  region={region}
                  onProduct={setSelected}
                  onProject={setProject}
                />
              ))}
          {page === "/about" &&
            sections
              .filter((s) => ["about", "features"].includes(s.type))
              .map((s) => (
                <SectionRenderer
                  key={s.id}
                  section={s}
                  region={region}
                  onProduct={setSelected}
                  onProject={setProject}
                />
              ))}
          {page === "/information" && (
            <div className="container information-page">
              <h2>{t("Как выбрать облицовочный кирпич")}</h2>
              <p>
                {t(
                  "Сравните оттенки и фактуры, определите формат кирпича и тип кладки. Посмотрите примеры фасадов в портфолио и обсудите решение с архитектором.",
                )}
              </p>
              <h2>{t("Расчёт количества")}</h2>
              <p>
                {t(
                  "Для предварительного расчёта используйте площадь стен без проёмов, размер кирпича и толщину шва. Окончательный объём и запас согласуйте со специалистом по вашему проекту.",
                )}
              </p>
              <h2>{t("Оплата и доставка")}</h2>
              <p>
                {t(
                  "Стоимость, сроки, условия оплаты и разгрузки согласуются индивидуально до оформления заказа. В демонстрационной версии онлайн-оплата не предусмотрена.",
                )}
              </p>
              <button className="button" onClick={() => setCallback(true)}>
                {t("Получить консультацию")}
                <ArrowRight size={17} />
              </button>
            </div>
          )}
          {["/contacts", "/dealers"].includes(page) && (
            <div className="container contacts-grid">
              <div>
                <h2>
                  {t(
                    page === "/dealers"
                      ? "Поставки по Казахстану"
                      : "Отдел продаж",
                  )}
                </h2>
                <p>
                  {t("Регион:")}{" "}
                  <button
                    className="text-button accent"
                    onClick={() => setRegionOpen(true)}
                  >
                    {region ? t(region) : t("Выбрать город")}
                  </button>
                </p>
                <p>
                  <MapPin size={19} />
                  {company.address}
                </p>
                <p>
                  <Phone size={19} />
                  {company.phone}
                </p>
                <p>
                  <Mail size={19} />
                  {company.email}
                </p>
                <p>{t("Понедельник–пятница: 9:00–18:00")}</p>
                {company.demo && (
                  <p className="demo-note">
                    {t(
                      "Контакты демонстрационные. Данные компании и дилеров нужно заполнить перед запуском.",
                    )}
                  </p>
                )}
              </div>
              <div>
                <h2>{t("Напишите нам")}</h2>
                <LeadForm
                  preview={!!previewDocument}
                  region={region}
                  subject={t(
                    page === "/dealers"
                      ? "Запрос дилера в регионе"
                      : "Обращение с сайта",
                  )}
                />
              </div>
            </div>
          )}
          {page.startsWith("/legal/") && (
            <LegalPage kind={page.split("/")[2]} company={company} />
          )}
          {!["/", ...nav.map(([path]) => path)].includes(page) &&
            !detailProduct &&
            !page.startsWith("/legal/") && (
              <div className="container empty-state">
                <p>{t("Такой страницы нет.")}</p>
                <Link to="/" className="button">
                  {t("На главную")}
                </Link>
              </div>
            )}
        </main>
        <footer>
          <div className="container footer-grid">
            <div>
              <Brand name={company.name} />
              <p>
                {t("Облицовочный кирпич")}
                <br />
                {t("для вашей архитектуры.")}
              </p>
              {company.demo && (
                <p className="demo-note">
                  {t(
                    "Демонстрационный сайт. Изображения и баннеры взяты из референса; предложения и проекты иллюстративны.",
                  )}
                </p>
              )}
            </div>
            <div>
              <h3>{t("Компания")}</h3>
              <Link to="/about">{t("О заводе")}</Link>
              <Link to="/projects">{t("Выполненные проекты")}</Link>
              <Link to="/dealers">{t("Где купить")}</Link>
              <Link to="/contacts">{t("Контакты")}</Link>
            </div>
            <div>
              <h3>{t("Информация")}</h3>
              <Link to="/catalog">{t("Каталог продукции")}</Link>
              <Link to="/information">{t("Оплата и доставка")}</Link>
              <Link to="/legal/privacy">
                {t("Политика конфиденциальности")}
              </Link>
              <Link to="/legal/terms">{t("Пользовательское соглашение")}</Link>
              <button
                className="text-button"
                onClick={() => setCookiesOpen(true)}
              >
                {t("Настройки cookies")}
              </button>
            </div>
            <div>
              <h3>{t("Контакты")}</h3>
              <strong>{company.phone}</strong>
              <p>{t("Пн–Пт: 9:00–18:00")}</p>
              <p>{company.address}</p>
              <p>{company.email}</p>
            </div>
          </div>
          <div className="container footer-bottom">
            <span>© 2026 {company.name}</span>
            <span>{t("Казахстан")}</span>
            <Link to="/admin">{t("Вход для редактора")}</Link>
          </div>
        </footer>
        <div className="floating-contact">
          <button
            aria-label={t("Заказать обратный звонок")}
            onClick={() => setCallback(true)}
          >
            <Phone size={20} />
          </button>
          <Link to="/contacts" aria-label={t("Написать нам")}>
            <Mail size={20} />
          </Link>
        </div>
        {!previewDocument && (
          <CookieBanner
            reopen={cookiesOpen}
            onClose={() => setCookiesOpen(false)}
          />
        )}
        {regionOpen && (
          <RegionDialog
            onClose={() => setRegionOpen(false)}
            onSelect={regionSelect}
          />
        )}
        {callback && (
          <Dialog
            title={t("Заказать звонок")}
            onClose={() => setCallback(false)}
          >
            <p className="muted">
              {t("Оставьте контакты, чтобы обсудить ваш проект.")}
            </p>
            <LeadForm
              preview={!!previewDocument}
              region={region}
              subject={t("Обратный звонок")}
            />
          </Dialog>
        )}
        {selected && (
          <Dialog title={selected.title} onClose={() => setSelected(null)}>
            <ProductGallery key={selected.id} item={selected} />
            <p>{selected.text}</p>
            <p className="detail-price">
              <ProductPrice item={selected} />
            </p>
            {activePromo(selected) && (
              <aside className="product-promo">
                {activePromo(selected)!.image && (
                  <img
                    className="promo-image"
                    src={activePromo(selected)!.image}
                    alt={activePromo(selected)!.label}
                  />
                )}
                <h3>{activePromo(selected)!.label}</h3>
                <p>{activePromo(selected)!.text}</p>
              </aside>
            )}
            <Link
              to={`/catalog/${selected.id}`}
              onClick={() => setSelected(null)}
            >
              {t("Страница товара")}
            </Link>
            <p className="muted">
              {t("Демонстрационная цена. Наличие и условия уточняются.")}
            </p>
            <LeadForm
              preview={!!previewDocument}
              region={region}
              subject={`${t("Заказ:")} ${selected.title} (${selected.id})`}
            />
          </Dialog>
        )}
        {project && (
          <Dialog title={project.title} onClose={() => setProject(null)}>
            <img
              className="custom-media"
              src={project.image}
              alt={project.title}
            />
            <p>{project.text}</p>
            <p className="muted">{t("Иллюстрация из референса.")}</p>
          </Dialog>
        )}
        {searchOpen && (
          <Dialog
            title={t("Поиск по каталогу")}
            onClose={() => setSearchOpen(false)}
          >
            <input
              aria-label={t("Поиск по каталогу")}
              placeholder={t("Название кирпича")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="search-results">
              {products
                .filter((item) =>
                  item.title.toLowerCase().includes(search.toLowerCase()),
                )
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSearchOpen(false);
                      setSelected(item);
                    }}
                  >
                    <img src={item.image} alt="" />
                    {item.title}
                    <ArrowRight size={17} />
                  </button>
                ))}
            </div>
          </Dialog>
        )}
      </div>
    </LanguageContext.Provider>
  );
}
