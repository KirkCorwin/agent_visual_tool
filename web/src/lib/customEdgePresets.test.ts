import { describe, expect, it } from "vitest";
import type { PlanningEdge } from "../graph/types";
import {
  findPresetForEdge,
  getEdgeRelationMenuValue,
  normalizeCustomEdgePresets,
  presetOptionValue,
} from "./customEdgePresets";

function edge(partial: Partial<PlanningEdge>): PlanningEdge {
  return {
    id: "e1",
    source: "a",
    target: "b",
    type: "depends_on",
    ...partial,
  } as PlanningEdge;
}

describe("customEdgePresets", () => {
  it("normalizes and dedupes presets", () => {
    const presets = normalizeCustomEdgePresets([
      { id: "a", label: "loop" },
      { id: "a", label: "dup" },
      { id: "b", label: "contains" },
    ]);
    expect(presets).toHaveLength(2);
    expect(presets[0].label).toBe("loop");
  });

  it("maps custom edge label to preset menu value", () => {
    const presets = normalizeCustomEdgePresets([{ id: "p1", label: "loop" }]);
    const e = edge({
      type: "references",
      data: { isCustom: true, label: "loop" },
    });
    expect(getEdgeRelationMenuValue(e, presets)).toBe(presetOptionValue("p1"));
    expect(findPresetForEdge(e, presets)?.id).toBe("p1");
  });
});
