import { describe, expect, it } from "vitest";
import { createEmptyGraph, createNode } from "./defaults";
import { buildImplicitStackEdges, syncImplicitStackEdges } from "./implicitEdges";
import { toFlowEdges } from "./reactFlowAdapter";
import { createEdge } from "./defaults";

describe("implicitEdges", () => {
  it("creates assigned_to and implements for stack parent", () => {
    const graph = createEmptyGraph();
    const parent = createNode("feature", { data: { title: "Parent" } });
    const child = createNode("task", {
      data: { title: "Child" },
      parentId: parent.id,
    });
    graph.nodes.push(parent, child);

    const implicit = buildImplicitStackEdges(graph);
    expect(implicit).toHaveLength(2);
    expect(implicit.some((e) => e.type === "assigned_to" && e.source === child.id)).toBe(
      true,
    );
    expect(implicit.some((e) => e.type === "implements" && e.source === parent.id)).toBe(
      true,
    );
  });

  it("hides implicit edges on canvas", () => {
    const graph = createEmptyGraph();
    const a = createNode("project");
    const b = createNode("task", { parentId: a.id });
    graph.nodes.push(a, b);
    const synced = syncImplicitStackEdges(graph);
    const visible = toFlowEdges(synced.edges);
    expect(visible).toHaveLength(0);
    expect(synced.edges.length).toBeGreaterThan(0);
  });

  it("keeps user-drawn edges alongside implicit", () => {
    const graph = createEmptyGraph();
    const a = createNode("project");
    const b = createNode("task");
    graph.nodes.push(a, b);
    graph.edges.push(createEdge("depends_on", b.id, a.id));
    const synced = syncImplicitStackEdges(graph);
    expect(synced.edges.filter((e) => !e.data?.implicit)).toHaveLength(1);
  });
});
