import { normalizeCustomPalettePages } from "../lib/paletteLayout";
import { MAX_CUSTOM_PALETTE_TYPES } from "../lib/customPaletteLimits";
import { DEFAULT_CUSTOM_NODE_PROMPT } from "./defaultPrompts";
import type { EditorConfig, EditorSettingsBundle } from "./editorConfig";
import { normalizeEditorConfig } from "./editorConfig";
import { normalizeGraph } from "./defaults";
import { nextCustomPinkColor } from "./nodeColors";
import type { PlanningGraph } from "./types";

export function buildEditorSettingsBundle(
  graph: PlanningGraph,
): EditorSettingsBundle {
  return {
    customTypes: graph.customNodeTypes ?? [],
    customPalettePages: graph.customPalettePages,
  };
}

/** Additive merge: missing custom types and page layout from settings bundle. */
export function applyEditorSettingsToProject(
  graph: PlanningGraph,
  rawConfig: Partial<EditorConfig>,
): { graph: PlanningGraph; editorConfig: EditorConfig } {
  const editorConfig = normalizeEditorConfig(rawConfig);
  const customPromptsByTypeId = { ...editorConfig.customPromptsByTypeId };
  let customNodeTypes = [...(graph.customNodeTypes ?? [])];
  const existingIds = new Set(customNodeTypes.map((t) => t.id));
  const bundle = rawConfig.settingsBundle;

  if (bundle?.customTypes) {
    for (const snap of bundle.customTypes) {
      if (
        typeof snap.id !== "string" ||
        !snap.id.trim() ||
        existingIds.has(snap.id) ||
        customNodeTypes.length >= MAX_CUSTOM_PALETTE_TYPES
      ) {
        continue;
      }
      const label =
        typeof snap.label === "string" && snap.label.trim()
          ? snap.label.trim()
          : "Custom";
      const color =
        typeof snap.color === "string" && snap.color.trim()
          ? snap.color.trim()
          : nextCustomPinkColor(customNodeTypes);
      customNodeTypes.push({ id: snap.id, label, color });
      existingIds.add(snap.id);
      if (!customPromptsByTypeId[snap.id]) {
        customPromptsByTypeId[snap.id] = DEFAULT_CUSTOM_NODE_PROMPT;
      }
    }
  }

  let customPalettePages = graph.customPalettePages;
  if (bundle?.customPalettePages?.length) {
    customPalettePages = bundle.customPalettePages;
  }

  const mergedGraph = normalizeGraph({
    ...graph,
    customNodeTypes,
    customPalettePages,
  });

  return {
    graph: mergedGraph,
    editorConfig: { ...editorConfig, customPromptsByTypeId },
  };
}
