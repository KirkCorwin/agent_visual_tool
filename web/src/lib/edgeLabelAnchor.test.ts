import { Position } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import { buildEdgePathThroughLabel, rectBorderPoint } from "./edgeLabelAnchor";

describe("rectBorderPoint", () => {
  it("picks left/right for horizontal approach", () => {
    const point = rectBorderPoint(100, 100, 50, 20, 0, 100);
    expect(point.position).toBe(Position.Left);
    expect(point.x).toBeLessThan(100);
  });
});

describe("buildEdgePathThroughLabel", () => {
  it("returns a continuous path with two cubics", () => {
    const path = buildEdgePathThroughLabel({
      sourceX: 0,
      sourceY: 50,
      targetX: 300,
      targetY: 50,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      labelX: 150,
      labelY: 50,
    });
    expect(path.startsWith("M")).toBe(true);
    expect(path.match(/[Cc]/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
