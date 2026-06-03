import { describe, expect, it } from "vitest";
import { createNode } from "./defaults";
import {
  computeStackZIndexes,
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
