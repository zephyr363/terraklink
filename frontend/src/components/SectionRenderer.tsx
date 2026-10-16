import { useTranslation } from "../i18n";
import { useState, type CSSProperties } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Check } from "lucide-react";
import type { ContentItem, Section } from "../domain/content";
import { LeadForm } from "./LeadForm";
import { ProductGallery } from "./ProductGallery";
import { ProductPrice } from "./ProductPrice";
import { activePromo } from "../domain/products";
import { LocalizedLink as Link } from "../i18n/navigation";

export function ProductCard({
  item,
  onSelect,
  onCompare,
  compared,
  compareDisabled,
}: {
  item: ContentItem;
  onSelect: (item: ContentItem) => void;
  onCompare?: (item: ContentItem) => void;
  compared?: boolean;
  compareDisabled?: boolean;
}) {
  const { t } = useTranslation();
  const promo = activePromo(item);
  return (
    <article className="product-card">
      {(promo?.label || item.tag) && (
        <span className="product-tag">{promo?.label || item.tag}</span>
      )}
      <ProductGallery item={item} compact onOpen={() => onSelect(item)} />
      <div className="product-body">
        <span className="eyebrow">{item.category}</span>
        <Link to={`/catalog/${item.id}`} className="text-button product-title">
          {item.title}
        </Link>
        <p className="product-code">
          {t("Артикул:")} {item.id.toUpperCase()}
        </p>
        {onCompare && (
          <button
            className="text-button"
            aria-pressed={compared}
            disabled={compareDisabled}
            onClick={() => onCompare(item)}
          >
            {t(compared ? "Убрать из сравнения" : "Сравнить")}
          </button>
        )}
        <div className="product-bottom">
          <ProductPrice item={item} />
          <button
            className="button outline small"
            onClick={() => onSelect(item)}
          >
            {t("Заказать")}
          </button>
        </div>
      </div>
    </article>
  );
}

function Hero({ section }: { section: Section }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const slides = section.items.length
    ? section.items
    : [{ image: section.image, title: section.title }];
  const current = slides[index % slides.length];
  const template =
    section.banner?.template ?? (section.video ? "video" : "image");
  const animation = section.banner?.animation ?? "none";
  return (
    <div
      className={`hero banner-${template} animation-${animation}`}
      aria-roledescription={t("карусель")}
    >
      {template === "video" && section.video ? (
        <video
          className="hero-image"
          src={section.video}
          poster={section.image}
          controls
          preload="metadata"
          style={{
            filter: `brightness(${section.brightness}%) saturate(${section.saturation}%)`,
          }}
        />
      ) : (
        <img
          key={`${index}-${template}-${animation}`}
          className="hero-image"
          src={current.image || section.image}
          alt={current.title}
          style={{
            filter: `brightness(${section.brightness}%) saturate(${section.saturation}%)`,
          }}
        />
      )}{" "}
      {(section.subtitle || template === "overlay" || template === "split") && (
        <div className="hero-caption">
          {(template === "overlay" || template === "split") && (
            <h2>{current.title || section.title}</h2>
          )}
          <p>{section.subtitle}</p>
          <a className="button" href="/catalog">
            {t("Перейти в каталог")}
            <ArrowRight size={18} />
          </a>
        </div>
      )}{" "}
      {template !== "video" && slides.length > 1 && (
        <>
          <button
            className="hero-arrow previous"
            onClick={() =>
              setIndex((index + slides.length - 1) % slides.length)
            }
            aria-label={t("Предыдущий баннер")}
          >
            <ChevronLeft />
          </button>
          <button
            className="hero-arrow next"
            onClick={() => setIndex((index + 1) % slides.length)}
            aria-label={t("Следующий баннер")}
          >
            <ChevronRight />
          </button>
          <div className="hero-dots">
            {slides.map((_, i) => (
              <button
                key={i}
                className={i === index ? "active" : ""}
                onClick={() => setIndex(i)}
                aria-label={`${t("Баннер")} ${i + 1}`}
                aria-pressed={i === index}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SectionMedia({
  section,
  className = "custom-media",
}: {
  section: Section;
  className?: string;
}) {
  if (section.video)
    return (
      <video
        className={className}
        src={section.video}
        poster={section.image || undefined}
        controls
        preload="metadata"
        style={{ filter: "var(--media-filter)" }}
      />
    );
  if (section.image)
    return (
      <img
        className={className}
        src={section.image}
        alt={section.title}
        loading="lazy"
        style={{ filter: "var(--media-filter)" }}
      />
    );
  return null;
}

export function SectionRenderer({
  section,
  region,
  onProduct,
  onProject,
  preview = false,
}: {
  section: Section;
  region: string;
  onProduct: (item: ContentItem) => void;
  onProject: (item: ContentItem) => void;
  preview?: boolean;
}) {
  const { t } = useTranslation();
  const style: CSSProperties = {
    color: section.color,
    backgroundColor: section.background,
    fontFamily: `'${section.font}', sans-serif`,
    "--media-filter": `brightness(${section.brightness}%) saturate(${section.saturation}%)`,
  } as CSSProperties;
  if (!section.visible) return null;
  if (section.type === "hero")
    return (
      <section id={section.id} style={style}>
        <Hero section={section} />
      </section>
    );
  if (section.type === "features")
    return (
      <section id={section.id} className="features" style={style}>
        <div className="container">
          {section.title && <h2>{section.title}</h2>}
          {section.subtitle && <p className="multiline">{section.subtitle}</p>}
          <div className="features-grid">
            {section.items.map((item) => (
              <div className="feature" key={item.id}>
                <img
                  src={item.image}
                  alt=""
                  style={{ filter: "var(--media-filter)" }}
                />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
          <SectionMedia section={section} />
        </div>
      </section>
    );
  return (
    <section
      id={section.id}
      className={`content-section section-${section.type}`}
      style={style}
    >
      <div className="container">
        {["catalog", "projects", "news"].includes(section.type) && (
          <div className="section-heading">
            <h2>{section.title}</h2>
            <a
              href={
                section.type === "catalog"
                  ? "/catalog"
                  : section.type === "projects"
                    ? "/projects"
                    : "/information"
              }
            >
              {t(
                section.type === "catalog"
                  ? "Перейти в каталог"
                  : section.type === "projects"
                    ? "Все проекты"
                    : "Все статьи",
              )}
              <ArrowRight size={15} />
            </a>
          </div>
        )}
        {section.type === "catalog" && (
          <>
            {section.subtitle && <p className="muted">{section.subtitle}</p>}
            <div className="product-grid">
              {section.items.map((item) => (
                <ProductCard key={item.id} item={item} onSelect={onProduct} />
              ))}
            </div>
          </>
        )}
        {section.type === "projects" && (
          <>
            <p className="muted">{section.subtitle}</p>
            <div className="project-grid">
              {section.items.map((item) => (
                <button
                  className="project-card"
                  key={item.id}
                  onClick={() => onProject(item)}
                >
                  <img src={item.image} alt={item.title} loading="lazy" />
                  <div>
                    <span>{item.category}</span>
                    <h3>{item.title}</h3>
                    <ArrowRight size={20} />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
        {section.type === "consultation" && (
          <div className="consultation">
            <div>
              <h2>{section.title}</h2>
              <p>{section.subtitle}</p>
              <ul className="question-list">
                {section.items.map((item) => (
                  <li key={item.id}>
                    <Check size={21} />
                    {item.title}
                  </li>
                ))}
              </ul>
            </div>
            <div className="consultation-form">
              <h3>{t("Поможем с выбором")}</h3>
              <p className="muted">{t("Оставьте номер для консультации")}</p>
              <LeadForm
                preview={preview}
                region={region}
                subject={t("Консультация по подбору кирпича")}
              />
            </div>
          </div>
        )}
        {section.type === "about" && (
          <div className="about-grid">
            <SectionMedia section={section} className="" />
            <div>
              <span className="eyebrow accent">{t("О компании")}</span>
              <h2>{section.title}</h2>
              <p className="multiline">{section.subtitle}</p>
              <a href="/catalog" className="button">
                {t("Перейти в каталог")}
                <ArrowRight size={17} />
              </a>
            </div>
          </div>
        )}
        {section.type === "contact" && (
          <div className="contact-call">
            <div>
              <h2>{section.title}</h2>
              <p>{section.subtitle}</p>
            </div>
            <a className="button" href="/contacts">
              {t("Связаться с нами")}
              <ArrowRight size={18} />
            </a>
          </div>
        )}
        {section.type === "news" && (
          <div className="project-grid">
            {section.items.map((item) => (
              <button
                className="project-card"
                key={item.id}
                onClick={() => onProject(item)}
              >
                <img src={item.image} alt={item.title} />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {["text", "image", "video"].includes(section.type) && (
          <>
            <h2>{section.title}</h2>
            <p className="multiline">{section.subtitle}</p>
          </>
        )}
        {section.type !== "about" && <SectionMedia section={section} />}
      </div>
    </section>
  );
}
