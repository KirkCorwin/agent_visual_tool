import type {
  AccessibleColorMode,
  CustomPaletteType,
  GraphEditorSettings,
  NodeType,
  PlanningGraph,
  PlanningNode,
} from "./types";

/** Neutral border on dark canvas (#1c1f28); replaces black in CUD palettes. */
const FOLDER_NEUTRAL = "#adb5bd";

/** Default node border colors (standard palette). */
export const STANDARD_NODE_TYPE_COLORS: Record<NodeType, string> = {
  project: "#4f8cff",
  requirement: "#9b7bff",
  feature: "#3ecf8e",
  component: "#f5a623",
  task: "#50c8e8",
  agent: "#e84a8a",
  decision: "#c77dff",
  constraint: "#ff8c69",
  folder: "#8b9cb3",
  custom: "#f06595",
};

/**
 * Slot 1 — Okabe–Ito / color universal design (CUD).
 * @see https://jfly.uni-koeln.de/color/
 * @see https://www.nature.com/articles/nmeth.1618 (Wong 2011)
 */
const OKABE_ITO_BY_TYPE: Record<NodeType, string> = {
  project: "#0072b2",
  requirement: "#cc79a7",
  feature: "#009e73",
  component: "#e69f00",
  task: "#56b4e9",
  agent: "#d55e00",
  decision: "#f0e442",
  constraint: "#ee6677",
  folder: FOLDER_NEUTRAL,
  custom: "#0072b2",
};

export const OKABE_ITO_CATEGORICAL_SLOTS = [
  "#0072b2",
  "#cc79a7",
  "#009e73",
  "#e69f00",
  "#56b4e9",
  "#d55e00",
  "#f0e442",
  "#ee6677",
] as const;

/**
 * Slot 2 — Paul Tol “vibrant” qualitative scheme (red–green safe).
 * @see https://sronpersonalpages.nl/~pault/
 */
const TOL_VIBRANT_BY_TYPE: Record<NodeType, string> = {
  project: "#0077bb",
  requirement: "#ee3377",
  feature: "#009988",
  component: "#ee7733",
  task: "#33bbee",
  agent: "#cc3311",
  decision: "#bbbbbb",
  constraint: "#882255",
  folder: FOLDER_NEUTRAL,
  custom: "#0077bb",
};

export const TOL_VIBRANT_CATEGORICAL_SLOTS = [
  "#0077bb",
  "#33bbee",
  "#009988",
  "#ee7733",
  "#cc3311",
  "#ee3377",
] as const;

/**
 * Slot 3 — Paul Tol “muted” qualitative scheme (blue–yellow safe emphasis).
 * @see https://personal.sron.nl/~pault/data/colourschemes.pdf
 */
const TOL_MUTED_BY_TYPE: Record<NodeType, string> = {
  project: "#332288",
  requirement: "#aa4499",
  feature: "#117733",
  component: "#ddcc77",
  task: "#88ccee",
  agent: "#cc6677",
  decision: "#999933",
  constraint: "#882255",
  folder: "#dddddd",
  custom: "#332288",
};

export const TOL_MUTED_CATEGORICAL_SLOTS = [
  "#332288",
  "#88ccee",
  "#44aa99",
  "#117733",
  "#999933",
  "#ddcc77",
  "#cc6677",
  "#882255",
  "#aa4499",
] as const;

export const ACCESSIBLE_PALETTES: Record<
  1 | 2 | 3,
  Record<NodeType, string>
> = {
  1: OKABE_ITO_BY_TYPE,
  2: TOL_VIBRANT_BY_TYPE,
  3: TOL_MUTED_BY_TYPE,
};

export const ACCESSIBLE_CATEGORICAL_SLOTS: Record<
  1 | 2 | 3,
  readonly string[]
> = {
  1: OKABE_ITO_CATEGORICAL_SLOTS,
  2: TOL_VIBRANT_CATEGORICAL_SLOTS,
  3: TOL_MUTED_CATEGORICAL_SLOTS,
};

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  project: "Project",
  requirement: "Requirement",
  feature: "Feature",
  component: "Component",
  task: "Task",
  agent: "Agent",
  decision: "Decision",
  constraint: "Constraint",
  folder: "Folder",
  custom: "Custom",
};

export const DEFAULT_GRAPH_SETTINGS: GraphEditorSettings = {
  deleteChildrenOnNodeDelete: false,
  accessibleColorMode: 0,
  edgeFollowsLabel: false,
};

export function parseAccessibleColorMode(
  raw: unknown,
  legacyAccessibleColors?: boolean,
): AccessibleColorMode {
  if (typeof raw === "number" && raw >= 0 && raw <= 3) {
    return raw as AccessibleColorMode;
  }
  if (legacyAccessibleColors === true) {
    return 1;
  }
  return 0;
}

export function toggleAccessibleColorMode(
  current: AccessibleColorMode,
  clicked: 1 | 2 | 3,
): AccessibleColorMode {
  return current === clicked ? 0 : clicked;
}

export function getAccessibleColorMode(
  settings: GraphEditorSettings | undefined,
): AccessibleColorMode {
  return settings?.accessibleColorMode ?? 0;
}

export function nextCustomPinkColor(existing: CustomPaletteType[]): string {
  const index = existing.length;
  const hue = (328 + index * 19) % 360;
  const lightness = 58 + (index % 5) * 3;
  return `hsl(${hue} 78% ${lightness}%)`;
}

export function resolveNodeTypeColors(
  settings: GraphEditorSettings | undefined,
): Record<NodeType, string> {
  const mode = getAccessibleColorMode(settings);
  if (mode === 0) {
    return STANDARD_NODE_TYPE_COLORS;
  }
  return ACCESSIBLE_PALETTES[mode];
}

export function findCustomPaletteType(
  graph: PlanningGraph,
  customTypeId: string | undefined,
): CustomPaletteType | undefined {
  if (!customTypeId) {
    return undefined;
  }
  return graph.customNodeTypes?.find((t) => t.id === customTypeId);
}

export function resolveCustomDisplayColor(
  graph: PlanningGraph,
  customTypeId: string | undefined,
): string {
  const entry = findCustomPaletteType(graph, customTypeId);
  const mode = getAccessibleColorMode(graph.settings);
  if (mode === 0) {
    return entry?.color ?? STANDARD_NODE_TYPE_COLORS.custom;
  }
  const types = graph.customNodeTypes ?? [];
  const index = entry ? types.findIndex((t) => t.id === entry.id) : -1;
  const slots = ACCESSIBLE_CATEGORICAL_SLOTS[mode];
  const slotIndex = index >= 0 ? index : types.length;
  return slots[slotIndex % slots.length] ?? ACCESSIBLE_PALETTES[mode].custom;
}

export function resolveNodeBorderColor(
  graph: PlanningGraph,
  node: PlanningNode,
): string {
  if (node.type === "custom") {
    return resolveCustomDisplayColor(graph, node.data.customTypeId);
  }
  return resolveNodeTypeColors(graph.settings)[node.type];
}

export function resolveNodeTypeLabel(
  graph: PlanningGraph,
  node: PlanningNode,
): string {
  if (node.type === "custom") {
    const custom = findCustomPaletteType(graph, node.data.customTypeId);
    return custom?.label ?? NODE_TYPE_LABELS.custom;
  }
  return NODE_TYPE_LABELS[node.type];
}

/** Normalize settings from graph JSON (legacy `accessibleColors` → mode 1). */
export function normalizeGraphSettings(
  settings: Partial<GraphEditorSettings> & { accessibleColors?: boolean },
): GraphEditorSettings {
  const legacy = settings.accessibleColors;
  const mode = parseAccessibleColorMode(
    settings.accessibleColorMode,
    legacy,
  );
  return {
    deleteChildrenOnNodeDelete:
      settings.deleteChildrenOnNodeDelete === true,
    accessibleColorMode: mode,
    edgeFollowsLabel: settings.edgeFollowsLabel === true,
  };
}
