import { describe, expect, it } from "vitest";
import { createEmptyGraph, createNode } from "../graph/defaults";
import { nodeExportPath } from "./paths";

describe("nodeExportPath", () => {
  it("places contained nodes under folder prefix", () => {
    const graph = createEmptyGraph();
    const folder = createNode("folder", { data: { title: "API Layer" } });
    const task = createNode("task", {
      data: { title: "Route" },
      folderId: folder.id,
    });
    graph.nodes.push(folder, task);

    const taskPath = nodeExportPath(task, graph);
    expect(taskPath).toMatch(/^folders\/api-layer-/);
    expect(taskPath).toContain("/tasks/");
  });
});
