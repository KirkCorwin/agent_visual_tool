import { getFolderRect, getPlanningNodeSize } from "./folderBounds";
import {
  computeStackZIndexes,
  enforceAncestorDescendantZOrder,
} from "./nodeZIndex";

const NESTED_Z_GAP = 1;
import type { PlanningGraph, PlanningNode } from "./types";

export type NodeRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function getNodeRect(node: PlanningNode): NodeRect {
  if (node.type === "folder") {
    return getFolderRect(node);
  }
  const { width, height } = getPlanningNodeSize(node);
  return {
    x: node.position.x,
    y: node.position.y,
    width,
    height,
  };
}

export function getNodeCenter(node: PlanningNode): { x: number; y: number } {
  const rect = getNodeRect(node);
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

export function pointInNodeRect(
  point: { x: number; y: number },
  node: PlanningNode,
): boolean {
  const rect = getNodeRect(node);
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function nodeHasNestedChildren(
  nodes: PlanningNode[],
  nodeId: string,
): boolean {
  return nodes.some((n) => n.parentId === nodeId);
}

export function getDescendantIds(
  nodes: PlanningNode[],
  rootId: string,
): string[] {
  const byParent = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parentId) {
      continue;
    }
    const list = byParent.get(node.parentId) ?? [];
    list.push(node.id);
    byParent.set(node.parentId, list);
  }

  const out: string[] = [];
  const stack = [...(byParent.get(rootId) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    out.push(id);
    stack.push(...(byParent.get(id) ?? []));
  }
  return out;
}

export function isDescendantOf(
  nodes: PlanningNode[],
  ancestorId: string,
  nodeId: string,
): boolean {
  return getDescendantIds(nodes, ancestorId).includes(nodeId);
}

export function wouldCreateParentCycle(
  nodes: PlanningNode[],
  nodeId: string,
  parentId: string,
): boolean {
  if (nodeId === parentId) {
    return true;
  }
  return isDescendantOf(nodes, nodeId, parentId);
}

/**
 * Topmost node under point wins (matches canvas z-order).
 * Tie-break: smaller area (typical “card on top” stack).
 */
export function findStackParent(
  point: { x: number; y: number },
  nodes: PlanningNode[],
  selfId: string,
  zById?: Map<string, number>,
): PlanningNode | undefined {
  const hits = nodes.filter(
    (candidate) =>
      candidate.id !== selfId &&
      !wouldCreateParentCycle(nodes, selfId, candidate.id) &&
      pointInNodeRect(point, candidate),
  );
  if (hits.length === 0) {
    return undefined;
  }
  return hits.sort((a, b) => {
    if (zById) {
      const zDiff = (zById.get(b.id) ?? 0) - (zById.get(a.id) ?? 0);
      if (zDiff !== 0) {
        return zDiff;
      }
    }
    return nodeArea(a) - nodeArea(b);
  })[0];
}

function nodeArea(node: PlanningNode): number {
  const rect = getNodeRect(node);
  return rect.width * rect.height;
}

export function resolveFolderIdForNode(
  node: PlanningNode,
  nodesById: Map<string, PlanningNode>,
): string | undefined {
  let current: PlanningNode | undefined = node;
  while (current?.parentId) {
    const parent = nodesById.get(current.parentId);
    if (!parent) {
      break;
    }
    if (parent.type === "folder") {
      return parent.id;
    }
    current = parent;
  }
  return undefined;
}

export function assignParentsFromPositions(
  graph: PlanningGraph,
  zById?: Map<string, number>,
  /** When set, only these nodes get a new parentId (e.g. after drag). Others are unchanged. */
  onlyNodeIds?: Set<string>,
): PlanningNode[] {
  const stackZ = enforceAncestorDescendantZOrder(
    graph.nodes,
    zById ?? computeStackZIndexes(graph.nodes),
  );
  const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));
  return graph.nodes.map((node) => {
    if (onlyNodeIds && !onlyNodeIds.has(node.id)) {
      return node;
    }
    const center = getNodeCenter(node);
    if (node.parentId) {
      const previousParent = nodesById.get(node.parentId);
      if (
        previousParent &&
        !wouldCreateParentCycle(graph.nodes, node.id, node.parentId) &&
        pointInNodeRect(center, previousParent)
      ) {
        const folderId = resolveFolderIdForNode(
          { ...node, parentId: node.parentId },
          nodesById,
        );
        return { ...node, parentId: node.parentId, folderId };
      }
    }
    const parent = findStackParent(center, graph.nodes, node.id, stackZ);
    const parentId = parent?.id;
    const folderId = parentId
      ? resolveFolderIdForNode({ ...node, parentId }, nodesById)
      : undefined;
    return { ...node, parentId, folderId };
  });
}

/**
 * While a nested parent is focused, keep descendants above the parent in z-order.
 * Selection uses structural z only; drag keeps outside elevation but parent still below children.
 */
export function resolveNestedFocusDisplayZ(
  nodes: PlanningNode[],
  focusAncestorId: string,
  canvasZById: Map<string, number>,
  mode: "selection" | "drag",
): Map<string, number> {
  const structural = enforceAncestorDescendantZOrder(
    nodes,
    computeStackZIndexes(nodes),
  );
  const descendantIds = getDescendantIds(nodes, focusAncestorId);
  const parentStructural = structural.get(focusAncestorId) ?? 0;

  if (mode === "selection") {
    const out = new Map(canvasZById);
    out.set(focusAncestorId, parentStructural);
    for (const descId of descendantIds) {
      out.set(
        descId,
        Math.max(structural.get(descId) ?? 0, parentStructural + NESTED_Z_GAP),
      );
    }
    return out;
  }

  const out = new Map(canvasZById);
  let maxDescendantZ = parentStructural;
  for (const descId of descendantIds) {
    const z = Math.max(
      out.get(descId) ?? 0,
      structural.get(descId) ?? 0,
      parentStructural + NESTED_Z_GAP,
    );
    out.set(descId, z);
    maxDescendantZ = Math.max(maxDescendantZ, z);
  }
  const parentZ = Math.min(
    out.get(focusAncestorId) ?? parentStructural,
    maxDescendantZ - NESTED_Z_GAP,
  );
  out.set(focusAncestorId, parentZ);
  return out;
}
