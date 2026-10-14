export type SectionType =
  | "hero"
  | "features"
  | "catalog"
  | "projects"
  | "consultation"
  | "about"
  | "news"
  | "contact"
  | "text"
  | "image"
  | "video";
export type Font = "Open Sans" | "Arial" | "Georgia";
export interface ContentItem {
  id: string;
  title: string;
  text: string;
  image: string;
  category: string;
  price: number | string;
  tag: string;
}
export interface Section {
  id: string;
  type: SectionType;
  title: string;
  subtitle: string;
  visible: boolean;
  image: string;
  video: string;
  color: string;
  background: string;
  font: Font;
  brightness: number;
  saturation: number;
  items: ContentItem[];
}
export interface SiteDocument {
  theme: { accent: string; font: Font };
  company: {
    name: string;
    phone: string;
    email: string;
    address: string;
    demo: boolean;
  };
  sections: Section[];
}
export interface ContentResponse {
  document: SiteDocument;
  revision: number;
  published_revision?: number;
}
export interface LeadRequest {
  name: string;
  phone: string;
  message: string;
  region: string;
  consent: boolean;
  consent_version: string;
  honeypot: string;
}
export interface Lead extends Omit<LeadRequest, "consent" | "honeypot"> {
  id: number;
  created_at: string;
  status: string;
}

export function newSection(type: SectionType): Section {
  return {
    id: `${type}-${crypto.randomUUID()}`,
    type,
    title: "Новая секция",
    subtitle: "",
    visible: true,
    image: "",
    video: "",
    color: "#222222",
    background: "#ffffff",
    font: "Open Sans",
    brightness: 100,
    saturation: 100,
    items: [],
  };
}

// Reordering is immutable so a failed save cannot mutate the cached server document.
export function moveSection(
  sections: Section[],
  id: string,
  direction: -1 | 1,
): Section[] {
  const from = sections.findIndex((section) => section.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= sections.length) return sections;
  const result = [...sections];
  [result[from], result[to]] = [result[to], result[from]];
  return result;
}

// The main banner image and first slide are one visible asset with two editor entry points.
export function patchSectionContent(
  section: Section,
  patch: Partial<Section>,
): Section {
  const next = { ...section, ...patch };
  if (section.type !== "hero") return next;
  if (patch.image !== undefined && next.items.length) {
    next.items = next.items.map((item, index) =>
      index === 0 ? { ...item, image: patch.image! } : item,
    );
  } else if (patch.items?.length) {
    next.image = patch.items[0].image;
  }
  return next;
}
