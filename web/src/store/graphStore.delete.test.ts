import { describe, expect, it } from "vitest";
import { createNode } from "../graph/defaults";
import { createTestGraphStoreState, graphReducer } from "./graphStore";

const baseState = () => createTestGraphStoreState();

describe("delete_node", () => {
  it("removes incident edges but keeps children when deleteChildrenOnNodeDelete is off", () => {
    const parent = createNode("feature", { id: "p", data: { title: "Parent" } });
    const child = createNode("task", {
      id: "c",
      parentId: "p",
      data: { title: "Child" },
    });
    let state = baseState();
    state = graphReducer(state, {
      type: "set_graph",
      graph: {
        ...state.graph,
        nodes: [parent, child],
        edges: [
          {
            id: "e1",
            type: "depends_on",
            source: "p",
            target: "c",
          },
        ],
      },
    });

    const next = graphReducer(state, { type: "delete_node", id: "p" });
    expect(next.graph.nodes.map((n) => n.id)).toEqual(["c"]);
    expect(next.graph.nodes[0].parentId).toBeUndefined();
    expect(next.graph.edges).toHaveLength(0);
  });

  it("removes descendants when deleteChildrenOnNodeDelete is on", () => {
    const parent = createNode("feature", { id: "p", data: { title: "Parent" } });
    const child = createNode("task", {
      id: "c",
      parentId: "p",
      data: { title: "Child" },
    });
    let state = baseState();
    state = graphReducer(state, {
      type: "set_graph",
      graph: {
        ...state.graph,
        settings: {
          deleteChildrenOnNodeDelete: true,
          accessibleColorMode: 0,
          edgeFollowsLabel: false,
          minimalEdgeLabels: false,
        },
        nodes: [parent, child],
        edges: [],
      },
    });

    const next = graphReducer(state, { type: "delete_node", id: "p" });
    expect(next.graph.nodes).toHaveLength(0);
  });
});
