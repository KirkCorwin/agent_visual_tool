import { newId } from "../graph/defaults";
import { isImplicitEdge } from "../graph/implicitEdges";
import type { PlanningEdge, PlanningNode } from "../graph/types";

const PASTE_OFFSET = { x: 28, y: 28 };

export type NodeClipboard = {
  nodes: PlanningNode[];
  edges: PlanningEdge[];
};

export function buildClipboardFromSelection(
  allNodes: PlanningNode[],
  allEdges: PlanningEdge[],
  selectedIds: string[],
  includeEdgesBetween: boolean,
): NodeClipboard {
  const idSet = new Set(selectedIds);
  const nodes = allNodes
    .filter((n) => idSet.has(n.id))
    .map((n) => structuredClone(n));

  if (!includeEdgesBetween) {
    return { nodes, edges: [] };
  }

  const edges = allEdges
    .filter(
      (e) =>
        !isImplicitEdge(e) &&
        idSet.has(e.source) &&
        idSet.has(e.target),
    )
    .map((e) => structuredClone(e));

  return { nodes, edges };
}

export function pasteClipboard(
  graphNodes: PlanningNode[],
  graphEdges: PlanningEdge[],
  clipboard: NodeClipboard,
  copyEdgesOnPaste: boolean,
): { nodes: PlanningNode[]; edges: PlanningEdge[]; newRootIds: string[] } {
  const idMap = new Map<string, string>();
  for (const node of clipboard.nodes) {
    idMap.set(node.id, newId());
  }

  const pastedNodes: PlanningNode[] = clipboard.nodes.map((node) => ({
    ...node,
    id: idMap.get(node.id)!,
    position: {
      x: node.position.x + PASTE_OFFSET.x,
      y: node.position.y + PASTE_OFFSET.y,
    },
    parentId:
      node.parentId && idMap.has(node.parentId)
        ? idMap.get(node.parentId)
        : node.parentId,
    folderId: node.folderId,
  }));

  const edgesToCopy = copyEdgesOnPaste ? clipboard.edges : [];
  const pastedEdges: PlanningEdge[] = edgesToCopy.map((edge) => ({
    ...edge,
    id: newId(),
    source: idMap.get(edge.source) ?? edge.source,
    target: idMap.get(edge.target) ?? edge.target,
    data: edge.data ? { ...edge.data, implicit: undefined } : undefined,
  }));

  return {
    nodes: [...graphNodes, ...pastedNodes],
    edges: [...graphEdges, ...pastedEdges],
    newRootIds: pastedNodes.map((n) => n.id),
  };
}
