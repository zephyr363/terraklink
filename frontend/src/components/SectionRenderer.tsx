import { useState, type CSSProperties } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Check } from "lucide-react";
import type { ContentItem, Section } from "../domain/content";
import { LeadForm } from "./LeadForm";

export function ProductCard({
  item,
  onSelect,
}: {
  item: ContentItem;
  onSelect: (item: ContentItem) => void;
}) {
  return (
    <article className="product-card">
      {item.tag && <span className="product-tag">{item.tag}</span>}
      <button
        className="product-image"
        onClick={() => onSelect(item)}
        aria-label={`Подробнее: ${item.title}`}
      >
        <img src={item.image} alt={item.title} loading="lazy" />
      </button>
      <div className="product-body">
        <span className="eyebrow">{item.category}</span>
        <button
          className="text-button product-title"
          onClick={() => onSelect(item)}
        >
          {item.title}
        </button>
        <p className="product-code">Артикул: {item.id.toUpperCase()}</p>
        <div className="product-bottom">
          <strong>
            {Number(item.price).toLocaleString("ru-RU")} ₸ <small>/ шт.</small>
          </strong>
          <button
            className="button outline small"
            onClick={() => onSelect(item)}
          >
            Заказать
          </button>
        </div>
      </div>
    </article>
  );
}

function Hero({ section }: { section: Section }) {
  const [index, setIndex] = useState(0);
  const slides = section.items.length
    ? section.items
    : [{ image: section.image, title: section.title }];
  const current = slides[index % slides.length];
  return (
    <div className="hero" aria-roledescription="карусель">
      {section.video ? (
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
          className="hero-image"
          src={current.image || section.image}
          alt={current.title}
          style={{
            filter: `brightness(${section.brightness}%) saturate(${section.saturation}%)`,
          }}
        />
      )}{" "}
      {section.subtitle && (
        <div className="hero-caption">
          <p>{section.subtitle}</p>
          <a className="button" href="/catalog">
            Перейти в каталог
            <ArrowRight size={18} />
          </a>
        </div>
      )}{" "}
      {!section.video && (
        <>
          <button
            className="hero-arrow previous"
            onClick={() =>
              setIndex((index + slides.length - 1) % slides.length)
            }
            aria-label="Предыдущий баннер"
          >
            <ChevronLeft />
          </button>
          <button
            className="hero-arrow next"
            onClick={() => setIndex((index + 1) % slides.length)}
            aria-label="Следующий баннер"
          >
            <ChevronRight />
          </button>
          <div className="hero-dots">
            {slides.map((_, i) => (
              <button
                key={i}
                className={i === index ? "active" : ""}
                onClick={() => setIndex(i)}
                aria-label={`Баннер ${i + 1}`}
                aria-pressed={i === index}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function SectionRenderer({
  section,
  region,
  onProduct,
  onProject,
}: {
  section: Section;
  region: string;
  onProduct: (item: ContentItem) => void;
  onProject: (item: ContentItem) => void;
}) {
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
        <div className="container features-grid">
          {section.items.map((item) => (
            <div className="feature" key={item.id}>
              <img src={item.image} alt="" />
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </div>
          ))}
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
              {section.type === "catalog"
                ? "Перейти в каталог"
                : section.type === "projects"
                  ? "Все проекты"
                  : "Все статьи"}
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
              <h3>Поможем с выбором</h3>
              <p className="muted">Оставьте номер для консультации</p>
              <LeadForm
                region={region}
                subject="Консультация по подбору кирпича"
              />
            </div>
          </div>
        )}
        {section.type === "about" && (
          <div className="about-grid">
            <img src={section.image} alt={section.title} loading="lazy" />
            <div>
              <span className="eyebrow accent">О компании</span>
              <h2>{section.title}</h2>
              <p className="multiline">{section.subtitle}</p>
              <a href="/catalog" className="button">
                Перейти в каталог
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
              Связаться с нами
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
            {section.type === "image" && section.image && (
              <img
                className="custom-media"
                src={section.image}
                alt={section.title}
              />
            )}{" "}
            {section.type === "video" && section.video && (
              <video
                className="custom-media"
                src={section.video}
                poster={section.image || undefined}
                controls
                preload="metadata"
              />
            )}
          </>
        )}
        {section.video && section.type !== "video" && (
          <video
            className="custom-media"
            src={section.video}
            poster={section.image || undefined}
            controls
            preload="metadata"
          />
        )}
      </div>
    </section>
  );
}
