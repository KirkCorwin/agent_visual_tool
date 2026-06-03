import { describe, expect, it } from "vitest";
import { createNode } from "./defaults";
import { createEdge } from "./defaults";
import {
  computeEdgeZIndexes,
  computeStackZIndexes,
  enforceAncestorDescendantZOrder,
  elevateSubtreeAboveRest,
  elevateSubtreeBand,
} from "./nodeZIndex";

describe("computeStackZIndexes", () => {
  it("renders children above their parent", () => {
    const parent = createNode("project", { position: { x: 0, y: 0 } });
    const child = createNode("task", {
      parentId: parent.id,
      position: { x: 20, y: 20 },
    });
    const z = computeStackZIndexes([parent, child]);
    expect(z.get(child.id)!).toBeGreaterThan(z.get(parent.id)!);
  });

  it("keeps folders below planning siblings under the same parent", () => {
    const parent = createNode("project");
    const folder = createNode("folder", { parentId: parent.id });
    const task = createNode("task", { parentId: parent.id });
    const z = computeStackZIndexes([parent, folder, task]);
    expect(z.get(folder.id)!).toBeLessThan(z.get(task.id)!);
  });

  it("keeps parent-child order inside a drag band", () => {
    const parent = createNode("feature");
    const child = createNode("task", { parentId: parent.id });
    const nodes = [parent, child];
    const band = elevateSubtreeBand(nodes, new Set([parent.id, child.id]), 1500);
    expect(band.get(child.id)!).toBeGreaterThan(band.get(parent.id)!);
    expect(band.get(parent.id)).toBe(1500);
  });

  it("respects current canvas z when lifting above other nodes", () => {
    const a = createNode("project");
    const b = createNode("feature");
    const canvasZ = new Map([
      [a.id, 10],
      [b.id, 2000],
    ]);
    const lifted = elevateSubtreeAboveRest([a, b], new Set([a.id]), canvasZ);
    expect(lifted.get(a.id)!).toBeGreaterThan(2000);
  });

  it("lifts a nested group above nodes outside the group", () => {
    const under = createNode("project");
    const parent = createNode("feature", { parentId: under.id });
    const child = createNode("task", { parentId: parent.id });
    const outsider = createNode("component");
    const group = new Set([parent.id, child.id]);
    const lifted = elevateSubtreeAboveRest(
      [under, parent, child, outsider],
      group,
    );
    const outsideZ = Math.max(
      lifted.get(under.id) ?? 0,
      lifted.get(outsider.id) ?? 0,
    );
    expect(lifted.get(parent.id)!).toBeGreaterThan(outsideZ);
    expect(lifted.get(child.id)!).toBeGreaterThan(lifted.get(parent.id)!);
  });

  it("enforceAncestorDescendantZOrder fixes inverted parent/child z", () => {
    const parent = createNode("feature", {
      data: { width: 400, height: 300 },
    });
    const child = createNode("task", {
      parentId: parent.id,
      data: { width: 120, height: 80 },
    });
    const broken = new Map([
      [parent.id, 500],
      [child.id, 10],
    ]);
    const fixed = enforceAncestorDescendantZOrder([parent, child], broken);
    expect(fixed.get(child.id)!).toBeGreaterThan(fixed.get(parent.id)!);
  });

  it("keeps child above parent after elevate when canvas z was inverted", () => {
    const parent = createNode("feature", {
      data: { width: 400, height: 300 },
    });
    const child = createNode("task", { parentId: parent.id });
    const canvasZ = new Map([
      [parent.id, 2000],
      [child.id, 5],
    ]);
    const lifted = elevateSubtreeAboveRest(
      [parent, child],
      new Set([parent.id, child.id]),
      canvasZ,
    );
    expect(lifted.get(child.id)!).toBeGreaterThan(lifted.get(parent.id)!);
  });

  it("places sibling edges below endpoints but above the shared parent", () => {
    const parent = createNode("feature");
    const childA = createNode("task", { parentId: parent.id });
    const childB = createNode("task", { parentId: parent.id });
    const nodes = [parent, childA, childB];
    const z = enforceAncestorDescendantZOrder(
      nodes,
      computeStackZIndexes(nodes),
    );
    const edge = createEdge("depends_on", childA.id, childB.id);
    const edgeZ = computeEdgeZIndexes([edge], z, nodes);
    const ez = edgeZ.get(edge.id)!;
    expect(ez).toBeGreaterThan(z.get(parent.id)!);
    expect(ez).toBeLessThan(z.get(childA.id)!);
    expect(ez).toBeLessThan(z.get(childB.id)!);
  });

  it("places child-to-outside edges below both endpoints and above crossed parent", () => {
    const parent = createNode("feature");
    const child = createNode("task", { parentId: parent.id });
    const outside = createNode("component");
    const nodes = [parent, child, outside];
    const z = enforceAncestorDescendantZOrder(
      nodes,
      computeStackZIndexes(nodes),
    );
    const edge = createEdge("depends_on", child.id, outside.id);
    const edgeZ = computeEdgeZIndexes([edge], z, nodes);
    const ez = edgeZ.get(edge.id)!;
    expect(ez).toBeLessThan(z.get(child.id)!);
    expect(ez).toBeLessThan(z.get(outside.id)!);
    expect(ez).toBeGreaterThan(z.get(parent.id)!);
  });

  it("allows a folder on a card but below other siblings on that card", () => {
    const card = createNode("feature", {
      position: { x: 0, y: 0 },
      data: { width: 300, height: 200 },
    });
    const folder = createNode("folder", {
      parentId: card.id,
      position: { x: 10, y: 10 },
    });
    const task = createNode("task", {
      parentId: card.id,
      position: { x: 40, y: 40 },
    });
    const z = computeStackZIndexes([card, folder, task]);
    expect(z.get(folder.id)!).toBeGreaterThan(z.get(card.id)!);
    expect(z.get(folder.id)!).toBeLessThan(z.get(task.id)!);
  });
});
