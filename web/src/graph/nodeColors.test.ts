import { describe, expect, it } from "vitest";
import { createEmptyGraph, createNode, newId } from "./defaults";
import {
  ACCESSIBLE_PALETTES,
  nextCustomPinkColor,
  normalizeGraphSettings,
  parseAccessibleColorMode,
  resolveCustomDisplayColor,
  resolveNodeBorderColor,
  resolveNodeTypeColors,
  STANDARD_NODE_TYPE_COLORS,
  toggleAccessibleColorMode,
} from "./nodeColors";

describe("nodeColors", () => {
  it("generates distinct pink hues for custom palette entries", () => {
    const a = nextCustomPinkColor([]);
    const b = nextCustomPinkColor([{ id: newId(), label: "A", color: a }]);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^hsl\(/);
    expect(b).toMatch(/^hsl\(/);
  });

  it("uses stored custom color in standard mode", () => {
    const customId = newId();
    const graph = createEmptyGraph();
    graph.customNodeTypes = [
      { id: customId, label: "Pink task", color: "hsl(330 80% 60%)" },
    ];
    const node = createNode("custom", {
      data: { title: "One", customTypeId: customId },
    });
    expect(resolveNodeBorderColor(graph, node)).toBe("hsl(330 80% 60%)");
  });

  it("returns different builtin maps per accessible mode", () => {
    const standard = resolveNodeTypeColors({ ...createEmptyGraph().settings!, accessibleColorMode: 0 });
    const mode1 = resolveNodeTypeColors({ ...createEmptyGraph().settings!, accessibleColorMode: 1 });
    const mode2 = resolveNodeTypeColors({ ...createEmptyGraph().settings!, accessibleColorMode: 2 });
    expect(mode1.project).not.toBe(standard.project);
    expect(mode2.project).not.toBe(mode1.project);
  });

  it("cycles accessible colors for custom types by index", () => {
    const graph = createEmptyGraph();
    graph.settings!.accessibleColorMode = 1;
    const idA = newId();
    const idB = newId();
    graph.customNodeTypes = [
      { id: idA, label: "A", color: "hsl(330 80% 60%)" },
      { id: idB, label: "B", color: "hsl(340 80% 60%)" },
    ];
    const colorA = resolveCustomDisplayColor(graph, idA);
    const colorB = resolveCustomDisplayColor(graph, idB);
    expect(colorA).not.toBe(colorB);
    expect(colorA).not.toBe("hsl(330 80% 60%)");
  });

  it("toggleAccessibleColorMode selects, switches, and turns off", () => {
    expect(toggleAccessibleColorMode(0, 1)).toBe(1);
    expect(toggleAccessibleColorMode(1, 1)).toBe(0);
    expect(toggleAccessibleColorMode(1, 2)).toBe(2);
    expect(toggleAccessibleColorMode(2, 1)).toBe(1);
  });

  it("migrates legacy accessibleColors to mode 1", () => {
    expect(parseAccessibleColorMode(undefined, true)).toBe(1);
    expect(
      normalizeGraphSettings({
        deleteChildrenOnNodeDelete: false,
        accessibleColors: true,
        edgeFollowsLabel: false,
      }).accessibleColorMode,
    ).toBe(1);
  });

  it("each accessible palette has distinct hues per builtin type", () => {
    for (const mode of [1, 2, 3] as const) {
      const palette = ACCESSIBLE_PALETTES[mode];
      const hues = new Set(
        Object.entries(palette)
          .filter(([t]) => t !== "folder" && t !== "custom")
          .map(([, hex]) => hex.toLowerCase()),
      );
      expect(hues.size).toBeGreaterThanOrEqual(7);
    }
  });

  it("mode 0 uses standard colors for project nodes", () => {
    const graph = createEmptyGraph();
    const node = createNode("project");
    expect(resolveNodeBorderColor(graph, node)).toBe(
      STANDARD_NODE_TYPE_COLORS.project,
    );
  });
});
