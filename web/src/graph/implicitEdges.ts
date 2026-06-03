import type { StackEdgeMapping } from "./editorConfig";
import { DEFAULT_STACK_EDGE_MAPPING } from "./editorConfig";
import type { PlanningEdge, PlanningGraph } from "./types";

export function isImplicitEdge(edge: PlanningEdge): boolean {
  return edge.data?.implicit === true;
}

function edgeFromSlot(
  kind: string,
  slot: StackEdgeMapping["childToParent"],
  source: string,
  target: string,
): PlanningEdge {
  const base = {
    id: implicitEdgeId(kind, source, target),
    source,
    target,
    type: slot.edgeType,
    data: { implicit: true as const },
  };
  if (slot.isCustom && slot.label?.trim()) {
    return {
      ...base,
      data: {
        implicit: true,
        isCustom: true,
        label: slot.label.trim(),
      },
    };
  }
  return base;
}

function implicitEdgeId(kind: string, source: string, target: string): string {
  return `implicit:${kind}:${source}:${target}`;
}

/** Stack parent ↔ child implicit edges (hidden on canvas); types from editor config. */
export function buildImplicitStackEdges(
  graph: PlanningGraph,
  mapping: StackEdgeMapping = DEFAULT_STACK_EDGE_MAPPING,
): PlanningEdge[] {
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
    edges.push(
      edgeFromSlot(
        "childToParent",
        mapping.childToParent,
        node.id,
        parent.id,
      ),
    );
    edges.push(
      edgeFromSlot(
        "parentToChild",
        mapping.parentToChild,
        parent.id,
        node.id,
      ),
    );
  }
  return edges;
}

export function syncImplicitStackEdges(
  graph: PlanningGraph,
  mapping?: StackEdgeMapping,
): PlanningGraph {
  const explicit = graph.edges.filter((edge) => !isImplicitEdge(edge));
  const implicit = buildImplicitStackEdges(graph, mapping);
  return { ...graph, edges: [...explicit, ...implicit] };
}

/** Rebuild implicit edges after parentId changes; keep user-created edges. */
export function mergeGraphWithImplicitEdges(
  graph: PlanningGraph,
  mapping?: StackEdgeMapping,
): PlanningGraph {
  return syncImplicitStackEdges(graph, mapping);
}
