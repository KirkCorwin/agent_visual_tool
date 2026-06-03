import { describe, expect, it } from "vitest";
import { createEmptyGraph, newId } from "../graph/defaults";
import { MAX_CUSTOM_PALETTE_TYPES } from "./customPaletteLimits";
import {
  createDefaultPalettePages,
  firstOpenPageForAdd,
  isAtGlobalCustomCap,
  normalizeCustomPalettePages,
  PALETTE_PAGE_IDS,
} from "./paletteLayout";

describe("normalizeCustomPalettePages", () => {
  it("creates four default pages when missing", () => {
    const graph = createEmptyGraph();
    const pages = normalizeCustomPalettePages(graph);
    expect(pages).toHaveLength(4);
    expect(pages.map((p) => p.id)).toEqual([...PALETTE_PAGE_IDS]);
  });

  it("assigns orphan custom types to palette 1", () => {
    const id = newId();
    const graph = createEmptyGraph();
    graph.customNodeTypes = [{ id, label: "X", color: "#f0f" }];
    graph.customPalettePages = createDefaultPalettePages();
    const pages = normalizeCustomPalettePages(graph);
    expect(pages[0].customTypeIds).toContain(id);
  });

  it("detects global cap", () => {
    const graph = createEmptyGraph();
    graph.customNodeTypes = Array.from({ length: MAX_CUSTOM_PALETTE_TYPES }, (_, i) => ({
      id: `id-${i}`,
      label: `C${i}`,
      color: "#f0f",
    }));
    expect(isAtGlobalCustomCap(graph)).toBe(true);
  });
});

describe("firstOpenPageForAdd", () => {
  it("picks first open page in order", () => {
    const pages = createDefaultPalettePages();
    const open = new Set(["palette-2", "palette-4"]);
    expect(firstOpenPageForAdd(open, pages, false)).toBe("palette-2");
  });
});
