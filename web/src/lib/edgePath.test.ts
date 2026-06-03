import { getBezierPath, Position } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import { DEFAULT_EDGE_CURVATURE } from "./edgeBundleLayout";
import {
  resolveAdaptiveCurvature,
  resolveCurvatureTowardLabel,
  resolveEdgePath,
  shouldBendCurveForLabelDrag,
} from "./edgePath";

describe("resolveAdaptiveCurvature", () => {
  it("boosts curvature for mostly vertical edges", () => {
    const horizontal = resolveAdaptiveCurvature(0, 0, 200, 10, DEFAULT_EDGE_CURVATURE);
    const vertical = resolveAdaptiveCurvature(0, 0, 20, 220, DEFAULT_EDGE_CURVATURE);
    expect(vertical).toBeGreaterThan(horizontal);
    expect(vertical).toBeGreaterThan(DEFAULT_EDGE_CURVATURE);
  });
});

describe("shouldBendCurveForLabelDrag", () => {
  it("bends when drag offset is meaningful", () => {
    expect(shouldBendCurveForLabelDrag({ dx: 0, dy: 0 })).toBe(false);
    expect(shouldBendCurveForLabelDrag({ dx: 10, dy: 5 })).toBe(true);
  });
});

describe("resolveEdgePath", () => {
  const endpoints = {
    sourceX: 0,
    sourceY: 0,
    targetX: 200,
    targetY: 100,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    curvature: DEFAULT_EDGE_CURVATURE,
    bundleLabelOffsetPx: 0,
  };

  it("keeps path unchanged when label is dragged but edgeFollowsLabel is off", () => {
    const base = resolveEdgePath(endpoints);
    const dragged = resolveEdgePath({
      ...endpoints,
      labelDrag: { dx: 30, dy: -20 },
      edgeFollowsLabel: false,
    });
    expect(dragged.path).toBe(base.path);
    expect(dragged.labelX).not.toBe(base.labelX);
  });

  it("routes through the label box when edgeFollowsLabel is on", () => {
    const routed = resolveEdgePath({
      ...endpoints,
      edgeFollowsLabel: true,
    });
    expect(routed.path.match(/[Cc]/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("adjusts curvature toward the label without a kinked two-segment path", () => {
    const endpoints = {
      sourceX: 0,
      sourceY: 0,
      targetX: 200,
      targetY: 100,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
    const base = DEFAULT_EDGE_CURVATURE;
    const bent = resolveCurvatureTowardLabel(endpoints, base, 120, 40);
    const [, midX, midY] = getBezierPath({ ...endpoints, curvature: bent });
    const [, baseMidX, baseMidY] = getBezierPath({
      ...endpoints,
      curvature: base,
    });
    const bentDist = (midX - 120) ** 2 + (midY - 40) ** 2;
    const baseDist = (baseMidX - 120) ** 2 + (baseMidY - 40) ** 2;
    expect(bentDist).toBeLessThanOrEqual(baseDist);
  });
});
