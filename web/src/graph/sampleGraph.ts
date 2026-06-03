import { createEdge, createEmptyGraph, createNode } from "./defaults";
import type { PlanningGraph } from "./types";

/** Small starter graph (no folder) for learning the canvas quickly. */
export function createSampleGraph(): PlanningGraph {
  const graph = createEmptyGraph("Sample: Task API");

  const project = createNode("project", {
    position: { x: 400, y: 40 },
    data: {
      title: "Task API",
      description: "REST API for tasks with local-first export.",
      width: 260,
      height: 100,
    },
  });

  const reqAuth = createNode("requirement", {
    position: { x: 120, y: 220 },
    parentId: project.id,
    data: {
      title: "Authentication",
      description: "Bearer token on all routes.",
      priority: "high",
      width: 220,
      height: 88,
    },
  });

  const reqCrud = createNode("requirement", {
    position: { x: 680, y: 220 },
    parentId: project.id,
    data: {
      title: "Task CRUD",
      description: "Create, read, update, delete.",
      priority: "high",
      width: 220,
      height: 88,
    },
  });

  const featureAuth = createNode("feature", {
    position: { x: 120, y: 380 },
    parentId: reqAuth.id,
    data: { title: "Auth middleware", status: "active", width: 200, height: 72 },
  });

  const featureCrud = createNode("feature", {
    position: { x: 680, y: 380 },
    parentId: reqCrud.id,
    data: { title: "Task routes", status: "draft", width: 200, height: 72 },
  });

  const taskSchema = createNode("task", {
    position: { x: 100, y: 540 },
    parentId: featureCrud.id,
    data: { title: "Define schema", status: "done", width: 180, height: 68 },
  });

  const taskRoutes = createNode("task", {
    position: { x: 400, y: 540 },
    parentId: featureCrud.id,
    data: { title: "CRUD routes", status: "active", width: 180, height: 68 },
  });

  const agent = createNode("agent", {
    position: { x: 700, y: 540 },
    parentId: project.id,
    data: {
      title: "Backend agent",
      role: "implementation",
      width: 200,
      height: 72,
    },
  });

  const decisionDb = createNode("decision", {
    position: { x: 200, y: 700 },
    data: {
      title: "Use SQLite",
      description: "Embedded DB for MVP.",
      width: 200,
      height: 72,
    },
  });

  graph.nodes.push(
    project,
    reqAuth,
    reqCrud,
    featureAuth,
    featureCrud,
    taskSchema,
    taskRoutes,
    agent,
    decisionDb,
  );

  graph.edges.push(
    createEdge("implements", featureAuth.id, reqAuth.id),
    createEdge("implements", featureCrud.id, reqCrud.id),
    createEdge("depends_on", taskRoutes.id, taskSchema.id),
    createEdge("depends_on", taskRoutes.id, featureCrud.id),
    createEdge("assigned_to", taskRoutes.id, agent.id),
    createEdge("references", decisionDb.id, taskRoutes.id),
  );

  return graph;
}
