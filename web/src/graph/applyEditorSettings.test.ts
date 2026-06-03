import { describe, expect, it } from "vitest";
import { createEmptyGraph, newId } from "./defaults";
import { applyEditorSettingsToProject } from "./applyEditorSettings";
import { DEFAULT_EDITOR_CONFIG } from "./editorConfig";
import { createDefaultPalettePages } from "../lib/paletteLayout";

describe("applyEditorSettingsToProject", () => {
  it("creates missing custom types from settings bundle", () => {
    const id = newId();
    const graph = createEmptyGraph();
    const { graph: next } = applyEditorSettingsToProject(graph, {
      ...DEFAULT_EDITOR_CONFIG,
      settingsBundle: {
        customTypes: [{ id, label: "Imported", color: "#abc" }],
        customPalettePages: createDefaultPalettePages().map((p, i) =>
          i === 0 ? { ...p, customTypeIds: [id] } : p,
        ),
      },
    });
    expect(next.customNodeTypes?.some((t) => t.id === id)).toBe(true);
    expect(next.customPalettePages?.[0].customTypeIds).toContain(id);
  });
});
