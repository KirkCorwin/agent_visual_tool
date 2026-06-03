import { describe, expect, it } from "vitest";
import { EDGE_TYPES } from "./types";
import { createSampleGraph } from "./sampleGraph";
import { validatePlanningGraph } from "./validation";

/** Types represented in the small starter graph (no folder / component / constraint). */
const SAMPLE_NODE_TYPES = [
  "project",
  "requirement",
  "feature",
  "task",
  "agent",
  "decision",
] as const;

describe("createSampleGraph", () => {
  it("validates and covers core planning types", () => {
    const graph = createSampleGraph();
    const result = validatePlanningGraph(graph);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.warnings).toEqual([]);

    for (const nodeType of SAMPLE_NODE_TYPES) {
      expect(graph.nodes.some((n) => n.type === nodeType)).toBe(true);
    }
    expect(graph.nodes.some((n) => n.type === "folder")).toBe(false);
    for (const edgeType of EDGE_TYPES) {
      expect(graph.edges.some((e) => e.type === edgeType)).toBe(true);
    }
  });
});
