import { describe, expect, it } from "vitest";
import { createEmptyGraph, createNode } from "../graph/defaults";
import { serializePlanningGraph } from "../graph/serialize";
import { parsePlanningGraphJson } from "../graph/serialize";
import { graphReducer, type GraphStoreState } from "./graphStore";

describe("selection", () => {
  const baseState = (): GraphStoreState => ({
    graph: createEmptyGraph("Test"),
    defaultEdgeType: "depends_on",
    selection: null,
    warnings: [],
    loadError: null,
  });

  it("clear_edge_selection keeps active node selection", () => {
    const node = createNode("task", { data: { title: "T" } });
    let state = baseState();
    state = graphReducer(state, {
      type: "set_selection",
      selection: { kind: "node", id: node.id },
    });
    state = graphReducer(state, { type: "clear_edge_selection" });
    expect(state.selection).toEqual({ kind: "node", id: node.id });
  });

  it("clear_edge_selection clears edge selection", () => {
    let state = baseState();
    state = graphReducer(state, {
      type: "set_selection",
      selection: { kind: "edge", id: "edge-1" },
    });
    state = graphReducer(state, { type: "clear_edge_selection" });
    expect(state.selection).toBeNull();
  });
});

describe("graph load contract", () => {
  it("invalid JSON does not produce a graph", () => {
    const result = parsePlanningGraphJson("{");
    expect(result.ok).toBe(false);
  });

  it("valid serialized graph round-trips for load", () => {
    const graph = createEmptyGraph("Load test");
    graph.nodes.push(createNode("project", { data: { title: "P" } }));
    const json = serializePlanningGraph(graph);
    const before = serializePlanningGraph(graph);
    const result = parsePlanningGraphJson(json);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(before).toBe(serializePlanningGraph(result.graph));
  });
});
