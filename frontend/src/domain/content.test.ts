import { describe, expect, it } from "vitest";
import { moveSection, newSection, placeSection } from "./content";
import { nearestCity } from "./consent";

describe("editor order", () => {
  it("places sections at first/last positions without mutation and rejects invalid positions", () => {
    const sections = [
      newSection("hero"),
      newSection("catalog"),
      newSection("projects"),
    ];
    expect(
      placeSection(sections, sections[0].id, 3).map((s) => s.type),
    ).toEqual(["catalog", "projects", "hero"]);
    expect(
      placeSection(sections, sections[2].id, 1).map((s) => s.type),
    ).toEqual(["projects", "hero", "catalog"]);
    expect(sections[0].type).toBe("hero");
    for (const position of [0, 4, 1.5, NaN, Infinity, 1])
      expect(placeSection(sections, sections[0].id, position)).toBe(sections);
    expect(placeSection(sections, "missing", 1)).toBe(sections);
  });
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
