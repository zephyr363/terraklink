import { describe, expect, it } from "vitest";
import { moveSection, newSection } from "./content";
import { nearestCity } from "./consent";

describe("editor order", () => {
  it("moves the chosen section without mutating its source", () => {
    const sections = [
      newSection("hero"),
      newSection("catalog"),
      newSection("projects"),
    ];
    const moved = moveSection(sections, sections[1].id, -1);
    expect(moved.map((s) => s.type)).toEqual(["catalog", "hero", "projects"]);
    expect(sections.map((s) => s.type)).toEqual([
      "hero",
      "catalog",
      "projects",
    ]);
  });
  it("keeps invalid and boundary moves unchanged", () => {
    const sections = [newSection("hero")];
    expect(moveSection(sections, sections[0].id, -1)).toBe(sections);
    expect(moveSection(sections, "missing", 1)).toBe(sections);
  });
});
describe("privacy preserving region lookup", () => {
  it("finds a nearby supported Kazakhstan city", () => {
    expect(nearestCity(43.24, 76.9)).toBe("Алматы");
    expect(nearestCity(44.85, 65.48)).toBe("Кызылорда");
  });
  it("does not mislabel locations outside the supported radius", () => {
    expect(nearestCity(55.75, 37.62)).toBeNull();
  });
});
