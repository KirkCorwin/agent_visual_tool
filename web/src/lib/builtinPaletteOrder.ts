import { PALETTE_BUILTIN_TYPES } from "./planningNodeTypes";
import type { NodeType } from "../graph/types";

/** Built-in + folder entries shown on master palette (not custom). */
export type BuiltinPaletteNodeType = Exclude<NodeType, "custom">;

export const DEFAULT_BUILTIN_PALETTE_ORDER: BuiltinPaletteNodeType[] = [
  ...PALETTE_BUILTIN_TYPES,
  "folder",
];

export const BUILTIN_SORTABLE_PREFIX = "builtin:" as const;

export function builtinSortableId(
  nodeType: BuiltinPaletteNodeType,
): string {
  return `${BUILTIN_SORTABLE_PREFIX}${nodeType}`;
}

export function parseBuiltinSortableId(
  id: string,
): BuiltinPaletteNodeType | null {
  if (!id.startsWith(BUILTIN_SORTABLE_PREFIX)) {
    return null;
  }
  const nodeType = id.slice(BUILTIN_SORTABLE_PREFIX.length) as BuiltinPaletteNodeType;
  if (!DEFAULT_BUILTIN_PALETTE_ORDER.includes(nodeType)) {
    return null;
  }
  return nodeType;
}

export function isBuiltinSortableId(id: string): boolean {
  return parseBuiltinSortableId(id) !== null;
}

export function normalizeBuiltinPaletteOrder(
  raw: string[] | undefined,
): BuiltinPaletteNodeType[] {
  const allowed = new Set(DEFAULT_BUILTIN_PALETTE_ORDER);
  const seen = new Set<BuiltinPaletteNodeType>();
  const out: BuiltinPaletteNodeType[] = [];

  if (raw?.length) {
    for (const item of raw) {
      if (typeof item !== "string" || !allowed.has(item as BuiltinPaletteNodeType)) {
        continue;
      }
      const t = item as BuiltinPaletteNodeType;
      if (seen.has(t)) {
        continue;
      }
      seen.add(t);
      out.push(t);
    }
  }

  for (const t of DEFAULT_BUILTIN_PALETTE_ORDER) {
    if (!seen.has(t)) {
      out.push(t);
    }
  }

  return out;
}

export function getBuiltinPaletteOrder(
  order: string[] | undefined,
): BuiltinPaletteNodeType[] {
  return normalizeBuiltinPaletteOrder(order);
}
