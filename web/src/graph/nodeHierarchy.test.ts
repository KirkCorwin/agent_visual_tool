import { describe, expect, it } from "vitest";
import { createEmptyGraph, createNode } from "./defaults";
import {
  assignParentsFromPositions,
  findStackParent,
  getDescendantIds,
  wouldCreateParentCycle,
} from "./nodeHierarchy";

describe("nodeHierarchy", () => {
  it("picks topmost z-index node under a point when provided", () => {
    const big = createNode("project", {
      position: { x: 0, y: 0 },
      data: { title: "Big", width: 400, height: 300 },
    });
    const small = createNode("task", {
      position: { x: 40, y: 40 },
      data: { title: "Small", width: 120, height: 80 },
    });
    const z = new Map([
      [big.id, 10],
      [small.id, 50],
    ]);
    const parent = findStackParent({ x: 100, y: 100 }, [big, small], "other", z);
    expect(parent?.id).toBe(small.id);
  });

  it("picks smallest node under a point without z map", () => {
    const folder = createNode("folder", {
      position: { x: 0, y: 0 },
      data: { title: "F", width: 400, height: 300 },
    });
    const inner = createNode("task", {
      position: { x: 40, y: 40 },
      data: { title: "T", width: 120, height: 80 },
    });
    const nodes = [folder, inner];
    const parent = findStackParent({ x: 100, y: 100 }, nodes, "other");
    expect(parent?.id).toBe(inner.id);
  });

  it("lists nested descendants", () => {
    const a = createNode("project");
    const b = createNode("feature", { parentId: a.id });
    const c = createNode("task", { parentId: b.id });
    const ids = getDescendantIds([a, b, c], a.id);
    expect(ids.sort()).toEqual([b.id, c.id].sort());
  });

  it("parents only the dragged node onto the drop target, not the reverse", () => {
    const graph = createEmptyGraph();
    const target = createNode("project", {
      position: { x: 0, y: 0 },
      data: { title: "Target", width: 320, height: 220 },
    });
    const dragged = createNode("task", {
      position: { x: 60, y: 60 },
      data: { title: "Dragged", width: 140, height: 90 },
    });
    graph.nodes.push(target, dragged);

    const flowZ = new Map([
      [target.id, 2],
      [dragged.id, 1500],
    ]);
    const updated = assignParentsFromPositions(
      graph,
      flowZ,
      new Set([dragged.id]),
    );
    expect(updated.find((n) => n.id === dragged.id)?.parentId).toBe(target.id);
    expect(updated.find((n) => n.id === target.id)?.parentId).toBeUndefined();
  });

  it("detects parent cycles", () => {
    const a = createNode("project");
    const b = createNode("feature", { parentId: a.id });
    expect(wouldCreateParentCycle([a, b], a.id, b.id)).toBe(true);
    expect(wouldCreateParentCycle([a, b], b.id, a.id)).toBe(false);
  });
});
