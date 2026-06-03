import { describe, expect, it } from "vitest";
import type { PlanningEdge } from "../graph/types";
import {
  computeEdgeBundleLayouts,
  DEFAULT_EDGE_CURVATURE,
  EDGE_BUNDLE_CURVATURE_STEP,
  offsetLabelPosition,
} from "./edgeBundleLayout";

function edge(id: string, source: string, target: string): PlanningEdge {
  return {
    id,
    type: "depends_on",
    source,
    target,
  };
}

describe("computeEdgeBundleLayouts", () => {
  it("uses default curvature for a single edge", () => {
    const layouts = computeEdgeBundleLayouts([edge("e1", "a", "b")]);
    expect(layouts.get("e1")).toEqual({
      bundleIndex: 0,
      bundleSize: 1,
      curvature: DEFAULT_EDGE_CURVATURE,
      labelOffsetPx: 0,
    });
  });

  it("spreads curvature and labels for parallel edges", () => {
    const layouts = computeEdgeBundleLayouts([
      edge("e2", "a", "b"),
      edge("e1", "a", "b"),
      edge("e3", "a", "b"),
    ]);
    expect(layouts.get("e1")?.bundleIndex).toBe(0);
    expect(layouts.get("e2")?.bundleIndex).toBe(1);
    expect(layouts.get("e3")?.bundleIndex).toBe(2);
    expect(layouts.get("e2")?.curvature).toBeCloseTo(DEFAULT_EDGE_CURVATURE);
    expect(layouts.get("e1")?.curvature).toBeCloseTo(
      DEFAULT_EDGE_CURVATURE - EDGE_BUNDLE_CURVATURE_STEP,
    );
    expect(layouts.get("e3")?.curvature).toBe(
      DEFAULT_EDGE_CURVATURE + EDGE_BUNDLE_CURVATURE_STEP,
    );
    expect(layouts.get("e1")?.labelOffsetPx).toBeLessThan(0);
    expect(layouts.get("e3")?.labelOffsetPx).toBeGreaterThan(0);
  });

  it("does not bundle reverse-direction edges together", () => {
    const layouts = computeEdgeBundleLayouts([
      edge("e1", "a", "b"),
      edge("e2", "b", "a"),
    ]);
    expect(layouts.get("e1")?.bundleSize).toBe(1);
    expect(layouts.get("e2")?.bundleSize).toBe(1);
  });
});

describe("offsetLabelPosition", () => {
  it("offsets along the normal", () => {
    const result = offsetLabelPosition(50, 50, 0, 0, 100, 0, 20);
    expect(result.x).toBe(50);
    expect(result.y).toBe(70);
  });
});
