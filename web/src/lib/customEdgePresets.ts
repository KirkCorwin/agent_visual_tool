import { newId } from "../graph/defaults";
import type { PlanningEdge } from "../graph/types";
import { isCustomEdge } from "./edgeDisplay";

export type CustomEdgePreset = {
  id: string;
  /** Relation text stored on edge.data.label (export + canvas). */
  label: string;
};

export const PRESET_EDGE_OPTION_PREFIX = "preset:" as const;

export const MAX_CUSTOM_EDGE_PRESETS = 32;

export const DEFAULT_CUSTOM_EDGE_PRESETS: CustomEdgePreset[] = [
  { id: "preset-loop", label: "loop" },
  { id: "preset-contains", label: "contains" },
  { id: "preset-triggers", label: "triggers" },
  { id: "preset-validates", label: "validates" },
  { id: "preset-extends", label: "extends" },
];

export function presetOptionValue(presetId: string): string {
  return `${PRESET_EDGE_OPTION_PREFIX}${presetId}`;
}

export function isPresetOptionValue(
  value: string,
): value is `${typeof PRESET_EDGE_OPTION_PREFIX}${string}` {
  return value.startsWith(PRESET_EDGE_OPTION_PREFIX);
}

export function presetIdFromOptionValue(value: string): string | null {
  if (!isPresetOptionValue(value)) {
    return null;
  }
  return value.slice(PRESET_EDGE_OPTION_PREFIX.length);
}

export function normalizeCustomEdgePresets(
  raw: CustomEdgePreset[] | undefined,
): CustomEdgePreset[] {
  if (!raw?.length) {
    return [...DEFAULT_CUSTOM_EDGE_PRESETS];
  }
  const seen = new Set<string>();
  const out: CustomEdgePreset[] = [];
  for (const item of raw) {
    if (typeof item.id !== "string" || !item.id.trim()) {
      continue;
    }
    const label =
      typeof item.label === "string" && item.label.trim()
        ? item.label.trim()
        : "relation";
    const id = item.id.trim();
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push({ id, label });
    if (out.length >= MAX_CUSTOM_EDGE_PRESETS) {
      break;
    }
  }
  return out.length > 0 ? out : [...DEFAULT_CUSTOM_EDGE_PRESETS];
}

export function findPresetForEdge(
  edge: PlanningEdge,
  presets: CustomEdgePreset[],
): CustomEdgePreset | undefined {
  if (!isCustomEdge(edge)) {
    return undefined;
  }
  const text = edge.data?.label?.trim();
  if (!text) {
    return undefined;
  }
  return presets.find((p) => p.label === text);
}

export function getEdgeRelationMenuValue(
  edge: PlanningEdge,
  presets: CustomEdgePreset[],
): string {
  const match = findPresetForEdge(edge, presets);
  if (match) {
    return presetOptionValue(match.id);
  }
  if (isCustomEdge(edge)) {
    return "custom";
  }
  return edge.type;
}

export function slotConfigMenuValue(
  slot: { edgeType: string; isCustom?: boolean; label?: string },
  presets: CustomEdgePreset[],
): string {
  if (slot.isCustom) {
    const text = slot.label?.trim();
    if (text) {
      const match = presets.find((p) => p.label === text);
      if (match) {
        return presetOptionValue(match.id);
      }
    }
    return "custom";
  }
  return slot.edgeType;
}

export function createCustomEdgePreset(label = "relation"): CustomEdgePreset {
  return { id: newId(), label: label.trim() || "relation" };
}

export function patchFromRelationMenuValue(
  value: string,
  presets: CustomEdgePreset[],
  currentSlot?: { edgeType: string },
): {
  edgeType?: string;
  isCustom: boolean;
  label?: string;
} {
  const presetId = presetIdFromOptionValue(value);
  if (presetId) {
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      return {
        edgeType: currentSlot?.edgeType ?? "references",
        isCustom: true,
        label: preset.label,
      };
    }
  }
  if (value === "custom") {
    return {
      edgeType: currentSlot?.edgeType ?? "references",
      isCustom: true,
      label: "",
    };
  }
  return {
    edgeType: value,
    isCustom: false,
    label: undefined,
  };
}
