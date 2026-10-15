import {
  LanguageContext,
  localizedDocument,
  useSiteLanguage,
  useTranslation,
  type Language,
} from "../i18n";
import { Fragment, useEffect, useState, type CSSProperties } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
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
  const title = nav.find(([path]) => path === page)?.[1];
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
      <div
        lang={language}
        className="public-site"
        onClickCapture={(event) => {
          if (!previewDocument || !(event.target instanceof Element)) return;
          const link = event.target.closest("a");
          const href = link?.getAttribute("href");
          if (!href?.startsWith("/") || href.startsWith("//")) return;
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
              <div className="product-grid">
                {products
                  .filter(
                    (item) =>
                      (category === "Все" || item.category === category) &&
                      `${item.title} ${item.id}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                  )
                  .map((item) => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      onSelect={setSelected}
                    />
                  ))}
              </div>
              {!products.some(
                (item) =>
                  (category === "Все" || item.category === category) &&
                  `${item.title} ${item.id}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
              ) && (
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
            <img
              className="detail-product"
              src={selected.image}
              alt={selected.title}
            />
            <p>{selected.text}</p>
            <p className="detail-price">
              {Number(selected.price).toLocaleString(
                language === "kk" ? "kk-KZ" : "ru-RU",
              )}{" "}
              {t("₸ / шт.")}
            </p>
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
