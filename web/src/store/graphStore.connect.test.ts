import { describe, expect, it } from "vitest";
import { createEmptyGraph, createNode } from "../graph/defaults";
import { createTestGraphStoreState, graphReducer } from "./graphStore";

describe("graphReducer connect", () => {
  it("adds an edge and keeps it in graph state", () => {
    const graph = createEmptyGraph();
    const a = createNode("feature", { data: { title: "A" } });
    const b = createNode("task", { data: { title: "B" } });
    graph.nodes.push(a, b);

    const initial = createTestGraphStoreState({ graph });

    const next = graphReducer(initial, {
      type: "connect",
      connection: {
        source: a.id,
        target: b.id,
        sourceHandle: null,
        targetHandle: null,
      },
    });

    expect(next.graph.edges).toHaveLength(1);
    expect(next.graph.edges[0].source).toBe(a.id);
    expect(next.graph.edges[0].target).toBe(b.id);
    expect(next.graph.edges[0].type).toBe("depends_on");
    expect(next.selection).toEqual({
      kind: "edge",
      id: next.graph.edges[0].id,
    });
  });

  it("allows multiple edges between the same nodes", () => {
    const graph = createEmptyGraph();
    const a = createNode("constraint", { data: { title: "C" } });
    const b = createNode("agent", { data: { title: "Agent" } });
    graph.nodes.push(a, b);

    const initial = createTestGraphStoreState({ graph });

    const first = graphReducer(initial, {
      type: "connect",
      connection: {
        source: a.id,
        target: b.id,
        sourceHandle: null,
        targetHandle: null,
      },
    });

    const second = graphReducer(first, {
      type: "connect",
      connection: {
        source: a.id,
        target: b.id,
        sourceHandle: null,
        targetHandle: null,
      },
    });

    expect(second.graph.edges).toHaveLength(2);
    expect(second.graph.edges[0].source).toBe(a.id);
    expect(second.graph.edges[1].source).toBe(a.id);
    expect(second.graph.edges[0].id).not.toBe(second.graph.edges[1].id);
  });
});
