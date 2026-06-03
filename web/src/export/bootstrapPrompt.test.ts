import { describe, expect, it } from "vitest";
import {
  createEdge,
  createEmptyGraph,
  createNode,
} from "../graph/defaults";
import { buildExportPackage } from "./buildPackage";
import { BOOTSTRAP_PROMPT_PATH, renderBootstrapPrompt } from "./bootstrapPrompt";
import { buildPathByNodeId } from "./markdown/planningIndex";

describe("renderBootstrapPrompt", () => {
  it("includes project, ordered tasks, agents, and package paths", () => {
    const graph = createEmptyGraph("Zip App");
    const project = createNode("project", {
      data: { title: "Zip App", description: "Build zip export" },
    });
    const constraint = createNode("constraint", {
      data: { title: "Local only", description: "No backend" },
    });
    const feature = createNode("feature", { data: { title: "ZIP" } });
    const taskA = createNode("task", { data: { title: "Add JSZip" } });
    const taskB = createNode("task", { data: { title: "Add button" } });
    const agent = createNode("agent", {
      data: { title: "Implementer", role: "dev" },
    });
    graph.nodes.push(project, constraint, feature, taskA, taskB, agent);
    graph.edges.push(
      createEdge("depends_on", taskB.id, taskA.id),
      createEdge("depends_on", taskB.id, feature.id),
      createEdge("assigned_to", taskA.id, agent.id),
    );

    const files = buildExportPackage(graph);
    const prompt = files.get(BOOTSTRAP_PROMPT_PATH)!;

    expect(prompt).toContain("# Bootstrap: Zip App");
    expect(prompt).toContain("graph.json");
    expect(prompt).toContain("planning/README.md");
    expect(prompt).toContain("Local only");
    expect(prompt).toContain("Add JSZip");
    expect(prompt).toContain("Add button");
    expect(prompt).toContain("Implementer");
    expect(prompt.indexOf("Add JSZip")).toBeLessThan(prompt.indexOf("Add button"));
    for (const path of files.keys()) {
      if (path === BOOTSTRAP_PROMPT_PATH) {
        continue;
      }
      expect(prompt).toContain(`\`${path}\``);
    }
  });

  it("only references paths present in the package", () => {
    const graph = createEmptyGraph("Refs");
    graph.nodes.push(createNode("task", { data: { title: "T1" } }));
    const pathByNodeId = buildPathByNodeId(graph);
    const paths = ["graph.json", "tasks/x.md"];
    const prompt = renderBootstrapPrompt(graph, pathByNodeId, paths);
    expect(prompt).toContain("`graph.json`");
    expect(prompt).not.toContain("phantom.md");
  });
});
