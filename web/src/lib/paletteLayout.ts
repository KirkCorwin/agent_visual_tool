import type { CustomPalettePage, PlanningGraph } from "../graph/types";
import { MAX_CUSTOM_PALETTE_TYPES } from "./customPaletteLimits";

export const PALETTE_PAGE_IDS = [
  "palette-1",
  "palette-2",
  "palette-3",
  "palette-4",
] as const;

export type PalettePageId = (typeof PALETTE_PAGE_IDS)[number];

export const PALETTE_PAGE_COUNT = PALETTE_PAGE_IDS.length;

export function defaultPalettePageName(index: number): string {
  return `Palette ${index + 1}`;
}

export function createDefaultPalettePages(): CustomPalettePage[] {
  return PALETTE_PAGE_IDS.map((id, index) => ({
    id,
    name: defaultPalettePageName(index),
    customTypeIds: [],
  }));
}

export function getPalettePageIndex(pageId: string): number {
  const index = PALETTE_PAGE_IDS.indexOf(pageId as PalettePageId);
  return index >= 0 ? index : 0;
}

/** Ensure 4 pages, unique type ids per page, orphans on page 1. */
export function normalizeCustomPalettePages(
  graph: Pick<PlanningGraph, "customNodeTypes" | "customPalettePages">,
): CustomPalettePage[] {
  const types = graph.customNodeTypes ?? [];
  const typeIds = new Set(types.map((t) => t.id));
  const raw = graph.customPalettePages ?? [];
  const byId = new Map<string, CustomPalettePage>();

  for (const page of raw) {
    if (typeof page.id !== "string") {
      continue;
    }
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const id of page.customTypeIds ?? []) {
      if (typeof id !== "string" || seen.has(id) || !typeIds.has(id)) {
        continue;
      }
      seen.add(id);
      ids.push(id);
    }
    byId.set(page.id, {
      id: page.id,
      name:
        typeof page.name === "string" && page.name.trim()
          ? page.name.trim()
          : defaultPalettePageName(getPalettePageIndex(page.id)),
      customTypeIds: ids,
    });
  }

  const pages = PALETTE_PAGE_IDS.map((id, index) => {
    const existing = byId.get(id);
    return (
      existing ?? {
        id,
        name: defaultPalettePageName(index),
        customTypeIds: [],
      }
    );
  });

  const assigned = new Set<string>();
  for (const page of pages) {
    for (const id of page.customTypeIds) {
      assigned.add(id);
    }
  }

  for (const type of types) {
    if (!assigned.has(type.id)) {
      pages[0].customTypeIds.push(type.id);
      assigned.add(type.id);
    }
  }

  return pages;
}

export function isAtGlobalCustomCap(graph: PlanningGraph): boolean {
  return (graph.customNodeTypes?.length ?? 0) >= MAX_CUSTOM_PALETTE_TYPES;
}

export function getPageTypeCount(
  pages: CustomPalettePage[],
  pageId: string,
): number {
  return pages.find((p) => p.id === pageId)?.customTypeIds.length ?? 0;
}

/** First open page (in order 1..4) with room under global cap; else palette-1. */
export function firstOpenPageForAdd(
  openPageIds: Set<string>,
  pages: CustomPalettePage[],
  atCap: boolean,
): PalettePageId {
  if (atCap) {
    return "palette-1";
  }
  for (const id of PALETTE_PAGE_IDS) {
    if (id === "palette-1") {
      continue;
    }
    if (openPageIds.has(id)) {
      return id;
    }
  }
  return "palette-1";
}

export const FALLBACK_VISIBLE_CUSTOM_ROWS = 4;

export function removeTypeFromAllPages(
  pages: CustomPalettePage[],
  typeId: string,
): CustomPalettePage[] {
  return pages.map((p) => ({
    ...p,
    customTypeIds: p.customTypeIds.filter((id) => id !== typeId),
  }));
}

export function appendTypeToPage(
  pages: CustomPalettePage[],
  pageId: string,
  typeId: string,
): CustomPalettePage[] {
  const cleaned = removeTypeFromAllPages(pages, typeId);
  return cleaned.map((p) =>
    p.id === pageId
      ? { ...p, customTypeIds: [...p.customTypeIds, typeId] }
      : p,
  );
}

export function moveTypeInPages(
  pages: CustomPalettePage[],
  typeId: string,
  toPageId: string,
  toIndex: number,
): CustomPalettePage[] {
  const cleaned = removeTypeFromAllPages(pages, typeId);
  return cleaned.map((p) => {
    if (p.id !== toPageId) {
      return p;
    }
    const ids = [...p.customTypeIds];
    const index = Math.max(0, Math.min(toIndex, ids.length));
    ids.splice(index, 0, typeId);
    return { ...p, customTypeIds: ids };
  });
}

export function reorderTypeInPage(
  pages: CustomPalettePage[],
  pageId: string,
  fromIndex: number,
  toIndex: number,
): CustomPalettePage[] {
  return pages.map((p) => {
    if (p.id !== pageId) {
      return p;
    }
    const ids = [...p.customTypeIds];
    if (
      fromIndex < 0 ||
      fromIndex >= ids.length ||
      toIndex < 0 ||
      toIndex >= ids.length
    ) {
      return p;
    }
    const [item] = ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, item);
    return { ...p, customTypeIds: ids };
  });
}

export function renamePageInPages(
  pages: CustomPalettePage[],
  pageId: string,
  name: string,
): CustomPalettePage[] {
  const trimmed = name.trim() || defaultPalettePageName(getPalettePageIndex(pageId));
  return pages.map((p) => (p.id === pageId ? { ...p, name: trimmed } : p));
}
