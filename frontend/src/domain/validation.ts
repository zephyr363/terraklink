import type { SiteDocument } from "./content";

function validMedia(value: string): boolean {
  if (!value) return true;
  if (/[\\\x00-\x1f]/.test(value) || value.length > 1000) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return (
      !url.username &&
      !url.password &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(url.hostname)))
    );
  } catch {
    return false;
  }
}

// Keep editor checks aligned with the API; the server remains the authority.
export function validateDocument(document: SiteDocument): string[] {
  const errors: string[] = [];
  const checkText = (
    value: string,
    max: number,
    label: string,
    required = false,
  ) => {
    if (value.length > max || (required && !value.trim()))
      errors.push(`${label}: заполните поле (до ${max} символов).`);
  };
  const checkContent = (
    content: Pick<SiteDocument, "company" | "sections" | "seo">,
    language: string,
  ) => {
    const prefix = `[${language}]`;
    checkText(content.company.name, 100, `${prefix} Название компании`, true);
    checkText(content.company.address, 300, `${prefix} Адрес`, true);
    const phone = content.company.phone;
    if (
      !/^[+\d ()-]{10,50}$/.test(phone) ||
      !/^\d{10,15}$/.test(phone.replace(/\D/g, ""))
    )
      errors.push(`${prefix} Телефон: укажите от 10 до 15 цифр.`);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content.company.email))
      errors.push(`${prefix} Email: некорректный адрес.`);
    if (content.sections.length < 1 || content.sections.length > 40)
      errors.push(`${prefix} Допустимо от 1 до 40 секций.`);
    const ids = new Set<string>();
    const productIds = new Set<string>();
    for (const section of content.sections) {
      const label = `${prefix} ${section.title || section.id}`;
      if (!/^[a-zA-Z0-9_-]{1,80}$/.test(section.id) || ids.has(section.id))
        errors.push(`${label}: ID секции должен быть уникальным.`);
      ids.add(section.id);
      checkText(section.title, 300, `${label}: заголовок`);
      checkText(section.subtitle, 5000, `${label}: текст`);
      if (!validMedia(section.image) || !validMedia(section.video))
        errors.push(`${label}: используйте HTTPS-ссылку или локальный путь.`);
      if (
        section.banner &&
        (!["image", "overlay", "split", "video"].includes(
          section.banner.template,
        ) ||
          !["none", "fade", "slide", "zoom"].includes(section.banner.animation))
      )
        errors.push(`${label}: выберите допустимые шаблон и анимацию баннера.`);
      if (
        ![section.color, section.background].every((value) =>
          /^#[\da-f]{6}$/i.test(value),
        )
      )
        errors.push(`${label}: некорректный цвет.`);
      if (!["Open Sans", "Arial", "Georgia"].includes(section.font))
        errors.push(`${label}: недопустимый шрифт.`);
      if (
        !Number.isInteger(section.brightness) ||
        section.brightness < 30 ||
        section.brightness > 150 ||
        !Number.isInteger(section.saturation) ||
        section.saturation < 0 ||
        section.saturation > 200
      )
        errors.push(`${label}: некорректные параметры цветокоррекции.`);
      const itemIds = new Set<string>();
      if (section.items.length > 100)
        errors.push(`${label}: не более 100 элементов.`);
      for (const item of section.items) {
        const attributes = item.attributes ?? [];
        if (
          attributes.length > 20 ||
          new Set(attributes.map((row) => row.name.trim().toLocaleLowerCase()))
            .size !== attributes.length ||
          attributes.some(
            (row) =>
              !row.name.trim() ||
              !row.value.trim() ||
              row.name.length > 80 ||
              row.value.length > 200,
          )
        )
          errors.push(
            `${label}: заполните до 20 характеристик с уникальными названиями.`,
          );
        if (!/^[a-zA-Z0-9_-]{1,80}$/.test(item.id) || itemIds.has(item.id))
          errors.push(`${label}: ID элементов должны быть уникальны.`);
        itemIds.add(item.id);
        if (section.type === "catalog") {
          if (productIds.has(item.id))
            errors.push(`${label}: ID товара уже используется в каталоге.`);
          productIds.add(item.id);
        }
        if (item.images) {
          if (
            item.images.length > 12 ||
            new Set(item.images.map((image) => image.id)).size !==
              item.images.length
          )
            errors.push(`${label}: до 12 фото с уникальными ID.`);
          if (
            item.images.some(
              (image) =>
                !image.url.trim() ||
                !validMedia(image.url) ||
                image.alt.length > 200,
            )
          )
            errors.push(
              `${label}: заполните корректные ссылки фотографий (HTTPS или локальный путь).`,
            );
        }
        if (item.promo) {
          const promo = item.promo;
          if (!validMedia(promo.image ?? ""))
            errors.push(`${label}: некорректная ссылка на изображение промо.`);
          if (promo.enabled && !promo.label.trim())
            errors.push(`${label}: укажите название промо.`);
          if (
            promo.starts_on &&
            promo.ends_on &&
            promo.ends_on < promo.starts_on
          )
            errors.push(`${label}: конец акции раньше начала.`);
          if (
            promo.price !== null &&
            (!/^\d+(\.\d{1,2})?$/.test(String(promo.price)) ||
              Number(promo.price) > Number(item.price))
          )
            errors.push(
              `${label}: проверьте промо-цену, она не должна превышать обычную.`,
            );
        }
        checkText(item.title, 200, `${label}: название элемента`, true);
        checkText(item.text, 2000, `${label}: описание`);
        checkText(item.category, 100, `${label}: категория`);
        checkText(item.tag, 100, `${label}: метка`);
        if (!validMedia(item.image))
          errors.push(`${label}: некорректная ссылка изображения.`);
        if (
          String(item.price).trim() === "" ||
          !/^\d+(\.\d{1,2})?$/.test(String(item.price)) ||
          Number(item.price) > 99999999.99
        )
          errors.push(
            `${label}: цена должна быть от 0 до 99 999 999,99 (не более двух знаков после точки).`,
          );
      }
    }
    const seo = content.seo;
    if (seo) {
      if (seo.site_url) {
        try {
          const url = new URL(seo.site_url);
          if (
            url.protocol !== "https:" ||
            url.username ||
            url.password ||
            url.pathname !== "/" ||
            url.search ||
            url.hash
          )
            throw new Error();
        } catch {
          errors.push(
            `${prefix} SEO: укажите HTTPS-адрес сайта без пути и параметров.`,
          );
        }
      }
      for (const key of ["og_image", "logo"] as const)
        if (!validMedia(seo[key] ?? ""))
          errors.push(`${prefix} SEO: некорректная ссылка изображения.`);
      if (
        (seo.latitude == null) !== (seo.longitude == null) ||
        (seo.latitude != null &&
          (!Number.isFinite(seo.latitude) || Math.abs(seo.latitude) > 90)) ||
        (seo.longitude != null &&
          (!Number.isFinite(seo.longitude) || Math.abs(seo.longitude) > 180))
      )
        errors.push(`${prefix} GEO: укажите обе корректные координаты.`);
      if (
        (seo.faq?.length ?? 0) > 20 ||
        seo.faq?.some((row) => !row.question.trim() || !row.answer.trim())
      )
        errors.push(`${prefix} FAQ: до 20 заполненных вопросов и ответов.`);
      if (
        seo.same_as?.some((value) => {
          try {
            return new URL(value).protocol !== "https:";
          } catch {
            return true;
          }
        })
      )
        errors.push(
          `${prefix} GEO: официальные профили должны использовать HTTPS.`,
        );
    }
  };
  if (
    !/^#[\da-f]{6}$/i.test(document.theme.accent) ||
    !["Open Sans", "Arial", "Georgia"].includes(document.theme.font)
  )
    errors.push("Проверьте оформление сайта.");
  checkContent(document, "RU");
  if (document.translations?.kk) checkContent(document.translations.kk, "KZ");
  return errors;
}
