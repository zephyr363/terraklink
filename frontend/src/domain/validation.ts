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
    content: Pick<SiteDocument, "company" | "sections">,
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
        if (!item.id.trim() || item.id.length > 80 || itemIds.has(item.id))
          errors.push(`${label}: ID элементов должны быть уникальны.`);
        itemIds.add(item.id);
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
