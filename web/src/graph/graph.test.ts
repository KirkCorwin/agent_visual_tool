import { describe, expect, it } from "vitest";
import {
  createEdge,
  createEmptyGraph,
  createNode,
} from "./defaults";
import {
  parsePlanningGraphJson,
  serializePlanningGraph,
} from "./serialize";
import { validatePlanningGraph } from "./validation";
import type { PlanningGraph } from "./types";

function sampleGraph(): PlanningGraph {
  const graph = createEmptyGraph("Demo");
  const project = createNode("project", {
    data: { title: "My App", description: "A local-first planner" },
  });
  const req = createNode("requirement", {
    data: { title: "Export ZIP" },
  });
  const feature = createNode("feature", { data: { title: "ZIP export feature" } });
  const task = createNode("task", { data: { title: "Wire export button" } });
  const agent = createNode("agent", {
    data: { title: "Builder agent", role: "implementation" },
  });
  graph.nodes.push(project, req, feature, task, agent);
  graph.edges.push(
    createEdge("implements", feature.id, req.id),
    createEdge("depends_on", task.id, feature.id),
    createEdge("assigned_to", task.id, agent.id),
  );
  return graph;
}

describe("PlanningGraph", () => {
  it("creates an empty graph with schema version 1", () => {
    const graph = createEmptyGraph();
    expect(graph.schemaVersion).toBe(1);
    expect(graph.nodes).toHaveLength(0);
    expect(graph.meta.name).toBe("Untitled project");
  });

  it("round-trips through JSON", () => {
    const graph = sampleGraph();
    const json = serializePlanningGraph(graph);
    const parsed = parsePlanningGraphJson(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.graph.nodes).toHaveLength(5);
    expect(parsed.graph.edges).toHaveLength(3);
    expect(parsed.warnings).toEqual([]);
  });

  it("rejects invalid edge type", () => {
    const raw = JSON.parse(serializePlanningGraph(sampleGraph())) as Record<
      string,
      unknown
    >;
    const edges = raw.edges as Record<string, unknown>[];
    edges[0].type = "invalid_type";
    const result = parsePlanningGraphJson(JSON.stringify(raw));
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.some((e) => e.includes("invalid"))).toBe(true);
  });

  it("rejects dangling edge endpoints", () => {
    const graph = createEmptyGraph();
    graph.edges.push(createEdge("depends_on", "missing-a", "missing-b"));
    const result = validatePlanningGraph(graph);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("warns when no project node exists", () => {
    const graph = createEmptyGraph();
    const task = createNode("task");
    graph.nodes.push(task);
    const result = validatePlanningGraph(graph);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.warnings.some((w) => w.includes("no project"))).toBe(true);
  });

  it("rejects malformed JSON", () => {
    const result = parsePlanningGraphJson("{ not json");
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors[0]).toBe("Invalid JSON");
  });

  it("rejects empty node title in JSON parse", () => {
    const graph = createEmptyGraph();
    graph.nodes.push(
      createNode("feature", { data: { title: "   " } }),
    );
    const broken = JSON.parse(serializePlanningGraph(graph)) as Record<
      string,
      unknown
    >;
    const nodes = broken.nodes as Record<string, unknown>[];
    (nodes[0].data as Record<string, unknown>).title = "   ";
    const result = parsePlanningGraphJson(JSON.stringify(broken));
    expect(result.ok).toBe(false);
  });
});
