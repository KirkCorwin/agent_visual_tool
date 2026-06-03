import type { PlanningEdge, PlanningGraph } from "./types";

export function isImplicitEdge(edge: PlanningEdge): boolean {
  return edge.data?.implicit === true;
}

function implicitEdgeId(kind: string, childId: string): string {
  return `implicit:${kind}:${childId}`;
}

/** Stack parent → child: assigned_to (child→parent) and implements (parent→child), hidden on canvas. */
export function buildImplicitStackEdges(graph: PlanningGraph): PlanningEdge[] {
  const edges: PlanningEdge[] = [];
  const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));

  for (const node of graph.nodes) {
    if (!node.parentId) {
      continue;
    }
    const parent = nodesById.get(node.parentId);
    if (!parent) {
      continue;
    }
    edges.push({
      id: implicitEdgeId("assigned_to", node.id),
      type: "assigned_to",
      source: node.id,
      target: parent.id,
      data: { implicit: true },
    });
    edges.push({
      id: implicitEdgeId("implements", node.id),
      type: "implements",
      source: parent.id,
      target: node.id,
      data: { implicit: true },
    });
  }
  return edges;
}

export function syncImplicitStackEdges(graph: PlanningGraph): PlanningGraph {
  const explicit = graph.edges.filter((edge) => !isImplicitEdge(edge));
  const implicit = buildImplicitStackEdges(graph);
  return { ...graph, edges: [...explicit, ...implicit] };
}

/** Rebuild implicit edges after parentId changes; keep user-created edges. */
export function mergeGraphWithImplicitEdges(graph: PlanningGraph): PlanningGraph {
  return syncImplicitStackEdges(graph);
}
