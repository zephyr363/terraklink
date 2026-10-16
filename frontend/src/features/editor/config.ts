import type { Font, SectionType } from "../../domain/content";
export const sectionNames: Record<SectionType, string> = {
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
export const fonts: Font[] = ["Open Sans", "Arial", "Georgia"];
