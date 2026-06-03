import { describe, expect, it } from "vitest";
import { createEmptyGraph, createNode } from "./defaults";
import {
  applyCanvasState,
  flowNodeToPlanning,
  mergeFlowNodesFromGraph,
  toFlowNode,
  toFlowNodes,
} from "./reactFlowAdapter";

describe("reactFlowAdapter", () => {
  it("round-trips a planning node", () => {
    const node = createNode("feature", {
      data: { title: "Auth", description: "Login flow" },
    });
    const flow = toFlowNode(node, 50);
    const back = flowNodeToPlanning(flow);
    expect(back.data.title).toBe("Auth");
    expect(back.type).toBe("feature");
  });

  it("prefers graph dimensions over stale React Flow node size on merge", () => {
    const graph = createEmptyGraph();
    const node = createNode("feature", {
      data: { title: "Auth", width: 320, height: 160 },
    });
    graph.nodes.push(node);

    const staleFlow = toFlowNode(
      {
        ...node,
        data: { ...node.data, width: 180, height: 88 },
      },
      50,
    );
    const stale = [{ ...staleFlow, width: 180, height: 88 }];

    const merged = mergeFlowNodesFromGraph(stale, graph);
    expect(merged[0]?.width).toBe(320);
    expect(merged[0]?.height).toBe(160);
    expect(merged[0]?.data.width).toBe(320);
    expect(merged[0]?.data.height).toBe(160);
  });

  it("merge keeps child z above parent after stale inverted canvas z", () => {
    const parent = createNode("feature", {
      data: { width: 400, height: 300 },
    });
    const child = createNode("task", {
      parentId: parent.id,
      position: { x: 30, y: 30 },
    });
    const graph = createEmptyGraph();
    graph.nodes.push(parent, child);

    const flow = toFlowNodes(graph);
    const stale = flow.map((n) => ({
      ...n,
      zIndex: n.id === parent.id ? 900 : 1,
    }));

    const merged = mergeFlowNodesFromGraph(stale, graph);
    const parentZ = merged.find((n) => n.id === parent.id)?.zIndex ?? 0;
    const childZ = merged.find((n) => n.id === child.id)?.zIndex ?? 0;
    expect(childZ).toBeGreaterThan(parentZ);
  });

  it("assigns parentId when node center is inside folder", () => {
    const graph = createEmptyGraph();
    const folder = createNode("folder", {
      position: { x: 0, y: 0 },
      data: { title: "Backend", width: 400, height: 300 },
    });
    const task = createNode("task", { position: { x: 50, y: 50 } });
    graph.nodes.push(folder, task);

    const flowNodes = [
      {
        id: folder.id,
        type: "folder",
        position: { x: 0, y: 0 },
        data: {
          title: "Backend",
          width: 400,
          height: 300,
        },
      },
      {
        id: task.id,
        type: "planning",
        position: { x: 50, y: 50 },
        data: {
          planningType: "task",
          title: "Work",
        },
      },
    ] as import("@xyflow/react").Node[];

    const updated = applyCanvasState(graph, flowNodes);
    const updatedTask = updated.nodes.find((n) => n.id === task.id);
    expect(updatedTask?.parentId).toBe(folder.id);
    expect(updatedTask?.folderId).toBe(folder.id);
  });
});
