import {
  DEFAULT_BOOTSTRAP_PROMPT,
  DEFAULT_NODE_PROMPTS,
  NODE_PROMPT_EXPORT_TYPES,
} from "./defaultPrompts";
import {
  normalizeCustomEdgePresets,
  type CustomEdgePreset,
} from "../lib/customEdgePresets";
import type { CustomPalettePage, CustomPaletteType, EdgeType, NodeType } from "./types";

export type { CustomEdgePreset };

export type EditorSettingsBundle = {
  customTypes?: CustomPaletteType[];
  customPalettePages?: CustomPalettePage[];
};

export const EDITOR_CONFIG_SCHEMA_VERSION = 3;

export type StackEdgeSlotConfig = {
  edgeType: EdgeType;
  isCustom?: boolean;
  label?: string;
};

export type StackEdgeMapping = {
  /** Child → parent (stack membership upward). Default: assigned_to */
  childToParent: StackEdgeSlotConfig;
  /** Parent → child (container owns child). Default: implements */
  parentToChild: StackEdgeSlotConfig;
};

export type EditorConfig = {
  schemaVersion: typeof EDITOR_CONFIG_SCHEMA_VERSION;
  stackEdgeMapping: StackEdgeMapping;
  nodePrompts: Partial<Record<NodeType, string>>;
  /** Export boilerplate per custom palette type id. */
  customPromptsByTypeId: Record<string, string>;
  bootstrapPrompt: string;
  /** When pasting nodes, also duplicate explicit edges between pasted nodes. */
  copyEdgesOnPaste: boolean;
  /** Named semantic relations (loop, contains, …) selectable in edge menus. */
  customEdgePresets: CustomEdgePreset[];
  /** Snapshot for additive import (types + palette layout). */
  settingsBundle?: EditorSettingsBundle;
};

export const DEFAULT_STACK_EDGE_MAPPING: StackEdgeMapping = {
  childToParent: { edgeType: "assigned_to" },
  parentToChild: { edgeType: "implements" },
};

export const DEFAULT_EDITOR_CONFIG: EditorConfig = {
  schemaVersion: EDITOR_CONFIG_SCHEMA_VERSION,
  stackEdgeMapping: DEFAULT_STACK_EDGE_MAPPING,
  nodePrompts: { ...DEFAULT_NODE_PROMPTS },
  customPromptsByTypeId: {},
  bootstrapPrompt: DEFAULT_BOOTSTRAP_PROMPT,
  copyEdgesOnPaste: false,
  customEdgePresets: normalizeCustomEdgePresets(undefined),
};

export function normalizeEditorConfig(
  raw: Partial<EditorConfig> | null | undefined,
): EditorConfig {
  const mapping = raw?.stackEdgeMapping ?? DEFAULT_STACK_EDGE_MAPPING;
  return {
    schemaVersion: EDITOR_CONFIG_SCHEMA_VERSION,
    stackEdgeMapping: {
      childToParent: normalizeSlot(
        mapping.childToParent,
        DEFAULT_STACK_EDGE_MAPPING.childToParent,
      ),
      parentToChild: normalizeSlot(
        mapping.parentToChild,
        DEFAULT_STACK_EDGE_MAPPING.parentToChild,
      ),
    },
    nodePrompts: {
      ...DEFAULT_NODE_PROMPTS,
      ...(raw?.nodePrompts ?? {}),
    },
    customPromptsByTypeId: {
      ...(raw?.customPromptsByTypeId ?? {}),
    },
    bootstrapPrompt:
      typeof raw?.bootstrapPrompt === "string" && raw.bootstrapPrompt.trim()
        ? raw.bootstrapPrompt
        : DEFAULT_BOOTSTRAP_PROMPT,
    copyEdgesOnPaste: raw?.copyEdgesOnPaste === true,
    customEdgePresets: normalizeCustomEdgePresets(raw?.customEdgePresets),
    settingsBundle: raw?.settingsBundle,
  };
}

/** Strip bundle before persisting to localStorage (graph holds layout). */
export function editorConfigForPersistence(config: EditorConfig): EditorConfig {
  const { settingsBundle: _bundle, ...rest } = config;
  return rest;
}

function normalizeSlot(
  slot: StackEdgeSlotConfig | undefined,
  fallback: StackEdgeSlotConfig,
): StackEdgeSlotConfig {
  if (!slot?.edgeType) {
    return { ...fallback };
  }
  return {
    edgeType: slot.edgeType,
    isCustom: slot.isCustom === true,
    label: typeof slot.label === "string" ? slot.label : undefined,
  };
}

export function parseEditorConfigJson(json: string): {
  ok: true;
  config: EditorConfig;
} | { ok: false; error: string } {
  try {
    const raw = JSON.parse(json) as Partial<EditorConfig>;
    return { ok: true, config: normalizeEditorConfig(raw) };
  } catch {
    return { ok: false, error: "Invalid JSON." };
  }
}

export function serializeEditorConfig(config: EditorConfig): string {
  return JSON.stringify(normalizeEditorConfig(config), null, 2);
}

export { NODE_PROMPT_EXPORT_TYPES };
