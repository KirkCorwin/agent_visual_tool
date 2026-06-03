import { describe, expect, it } from "vitest";
import {
  createEdge,
  createEmptyGraph,
  createNode,
} from "../graph/defaults";
import type { PlanningGraph } from "../graph/types";
import { relativePath } from "./paths";
import { buildExportPackage, GRAPH_JSON_PATH } from "./buildPackage";

function fixtureGraph(): PlanningGraph {
  const graph = createEmptyGraph("Demo App");
  const project = createNode("project", {
    data: { title: "Demo App", description: "Sample project" },
  });
  const req = createNode("requirement", {
    data: { title: "Export ZIP", description: "Must export zip" },
  });
  const feature = createNode("feature", { data: { title: "ZIP export" } });
  const task = createNode("task", {
    data: { title: "Wire export", status: "draft" },
  });
  const agent = createNode("agent", {
    data: { title: "Builder", role: "coder" },
  });
  const decision = createNode("decision", { data: { title: "Use JSZip" } });
  graph.nodes.push(project, req, feature, task, agent, decision);
  graph.edges.push(
    createEdge("implements", feature.id, req.id),
    createEdge("depends_on", task.id, feature.id),
    createEdge("assigned_to", task.id, agent.id),
    createEdge("references", decision.id, req.id),
  );
  return graph;
}

describe("buildExportPackage", () => {
  it("emits graph.json and per-node markdown files", () => {
    const graph = fixtureGraph();
    const files = buildExportPackage(graph);

    expect(files.has(GRAPH_JSON_PATH)).toBe(true);
    expect(files.has("planning/README.md")).toBe(true);
    const project = graph.nodes.find((n) => n.type === "project")!;
    expect(files.has(`planning/project/${project.id}.md`)).toBe(true);
    expect(files.has(`tasks/${graph.nodes.find((n) => n.type === "task")!.id}.md`)).toBe(
      true,
    );
    expect(files.has(`agents/${graph.nodes.find((n) => n.type === "agent")!.id}.md`)).toBe(
      true,
    );
    expect(files.has("prompts/bootstrap.md")).toBe(true);
    expect(files.size).toBe(graph.nodes.length + 3);
  });

  it("includes cross-reference links that resolve within the package", () => {
    const graph = fixtureGraph();
    const files = buildExportPackage(graph);
    const task = graph.nodes.find((n) => n.type === "task")!;
    const taskPath = `tasks/${task.id}.md`;
    const taskDoc = files.get(taskPath)!;

    const agent = graph.nodes.find((n) => n.type === "agent")!;
    const agentPath = `agents/${agent.id}.md`;
    const expectedLink = relativePath(taskPath, agentPath);

    expect(taskDoc).toContain(`](${expectedLink})`);
    expect(files.has(agentPath)).toBe(true);
  });

  it("planning README indexes all nodes", () => {
    const graph = fixtureGraph();
    const files = buildExportPackage(graph);
    const readme = files.get("planning/README.md")!;

    for (const node of graph.nodes) {
      expect(readme).toContain(node.data.title);
    }
    expect(readme).toContain("graph.json");
  });

  it("includes node anchor comments for machine parsing", () => {
    const graph = fixtureGraph();
    const files = buildExportPackage(graph);
    const project = graph.nodes.find((n) => n.type === "project")!;
    const doc = files.get(`planning/project/${project.id}.md`)!;

    expect(doc).toContain(`<!-- node:id=${project.id} type=project -->`);
    expect(doc).toContain("## Description");
    expect(doc).toContain("Sample project");
  });

  it("renders related inbound and outbound sections", () => {
    const graph = fixtureGraph();
    const files = buildExportPackage(graph);
    const task = graph.nodes.find((n) => n.type === "task")!;
    const doc = files.get(`tasks/${task.id}.md`)!;

    expect(doc).toContain("## Related");
    expect(doc).toContain("### Outbound");
    expect(doc).toContain("depends_on");
    expect(doc).toContain("assigned_to");
  });
});

describe("relativePath", () => {
  it("computes paths between task and agent folders", () => {
    expect(relativePath("tasks/a.md", "agents/b.md")).toBe("../agents/b.md");
  });

  it("computes paths within planning tree", () => {
    expect(
      relativePath(
        "planning/features/a.md",
        "planning/requirements/b.md",
      ),
    ).toBe("../requirements/b.md");
  });
});
