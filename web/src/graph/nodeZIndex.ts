import { getFolderSize, getPlanningNodeSize } from "./folderBounds";
import type { PlanningEdge, PlanningNode } from "./types";

const FOLDER_STEP = 2;
const PLANNING_STEP = 10;
/** Minimum z gap so nested cards always paint above their container. */
const ANCESTOR_Z_GAP = 1;
/** Edges sit below both endpoints; gap 2 keeps labels (edge z + 1) under endpoint nodes. */
const EDGE_BELOW_ENDPOINT_GAP = 2;
/** Edges rise above ancestor containers they cross (not the endpoints themselves). */
const EDGE_ABOVE_CROSSED_ANCESTOR_GAP = 1;

function nodeArea(node: PlanningNode): number {
  const { width, height } =
    node.type === "folder" ? getFolderSize(node) : getPlanningNodeSize(node);
  return width * height;
}

/** Folders before planning cards; smaller cards above larger ties. */
function compareSiblingOrder(a: PlanningNode, b: PlanningNode): number {
  if (a.type === "folder" && b.type !== "folder") {
    return -1;
  }
  if (b.type === "folder" && a.type !== "folder") {
    return 1;
  }
  return nodeArea(a) - nodeArea(b);
}

/**
 * Derive canvas z-order from parentId stacking.
 * Children render above parents; folders stay below planning siblings at the same level.
 */
export function computeStackZIndexes(
  nodes: PlanningNode[],
): Map<string, number> {
  const childrenByParent = new Map<string | undefined, PlanningNode[]>();
  for (const node of nodes) {
    const key = node.parentId;
    const list = childrenByParent.get(key) ?? [];
    list.push(node);
    childrenByParent.set(key, list);
  }

  const z = new Map<string, number>();

  function visit(parentId: string | undefined, floor: number): number {
    const siblings = childrenByParent.get(parentId) ?? [];
    const sorted = [...siblings].sort(compareSiblingOrder);
    let cursor = floor;
    for (const node of sorted) {
      z.set(node.id, cursor);
      const isFolder = node.type === "folder";
      const step = isFolder ? FOLDER_STEP : PLANNING_STEP;
      const afterChildren = visit(node.id, cursor + step);
      cursor = Math.max(afterChildren, cursor + step);
    }
    return cursor;
  }

  visit(undefined, 0);
  return z;
}

function nodeDepth(
  nodeId: string,
  nodesById: Map<string, PlanningNode>,
): number {
  let depth = 0;
  let current = nodesById.get(nodeId);
  const seen = new Set<string>();
  while (current?.parentId && !seen.has(current.parentId)) {
    seen.add(current.parentId);
    depth += 1;
    current = nodesById.get(current.parentId);
  }
  return depth;
}

/**
 * Ensure every child is strictly above its parent in z-order (fixes nested drag / merge).
 */
export function enforceAncestorDescendantZOrder(
  allNodes: PlanningNode[],
  zById: Map<string, number>,
): Map<string, number> {
  const nodesById = new Map(allNodes.map((n) => [n.id, n]));
  const out = new Map<string, number>();
  for (const node of allNodes) {
    out.set(node.id, zById.get(node.id) ?? 0);
  }

  const byDepth = [...allNodes].sort(
    (a, b) => nodeDepth(a.id, nodesById) - nodeDepth(b.id, nodesById),
  );

  for (let pass = 0; pass < allNodes.length; pass++) {
    let changed = false;
    for (const node of byDepth) {
      if (!node.parentId) {
        continue;
      }
      const parentZ = out.get(node.parentId);
      if (parentZ === undefined) {
        continue;
      }
      const childZ = out.get(node.id) ?? 0;
      const minChild = parentZ + ANCESTOR_Z_GAP;
      if (childZ < minChild) {
        out.set(node.id, minChild);
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
  }

  return out;
}

/** Apply stack z from graph hierarchy onto flow nodes (always enforces parent < child). */
export function applyHierarchyZToFlowNodes(
  planningNodes: PlanningNode[],
  flowNodes: { id: string; zIndex?: number }[],
): Map<string, number> {
  const structural = computeStackZIndexes(planningNodes);
  const enforced = enforceAncestorDescendantZOrder(planningNodes, structural);
  for (const flow of flowNodes) {
    if (!enforced.has(flow.id)) {
      enforced.set(flow.id, flow.zIndex ?? 0);
    }
  }
  return enforceAncestorDescendantZOrder(planningNodes, enforced);
}

/** Stack z for a nested drag group — parents outside the set are ignored. */
export function computeStackZIndexesForSubset(
  allNodes: PlanningNode[],
  subsetIds: Set<string>,
): Map<string, number> {
  const subsetNodes = allNodes
    .filter((n) => subsetIds.has(n.id))
    .map((n) => ({
      ...n,
      parentId:
        n.parentId && subsetIds.has(n.parentId) ? n.parentId : undefined,
    }));
  return computeStackZIndexes(subsetNodes);
}

/** Preserve internal stack order; shift the whole subset to start at floorZ. */
export function elevateSubtreeBand(
  allNodes: PlanningNode[],
  subsetIds: Set<string>,
  floorZ: number,
): Map<string, number> {
  const internal = computeStackZIndexesForSubset(allNodes, subsetIds);
  let minZ = Infinity;
  for (const id of subsetIds) {
    minZ = Math.min(minZ, internal.get(id) ?? 0);
  }
  if (!Number.isFinite(minZ)) {
    minZ = 0;
  }
  const out = new Map<string, number>();
  for (const id of subsetIds) {
    out.set(id, floorZ + (internal.get(id) ?? 0) - minZ);
  }
  return out;
}

/** Raise a dragged subtree above every node not in the group (keeps inner ordering). */
export function elevateSubtreeAboveRest(
  allNodes: PlanningNode[],
  subsetIds: Set<string>,
  canvasZById?: Map<string, number>,
): Map<string, number> {
  const global = computeStackZIndexes(allNodes);
  let maxOutside = 0;
  for (const node of allNodes) {
    if (!subsetIds.has(node.id)) {
      const canvasZ = canvasZById?.get(node.id);
      maxOutside = Math.max(
        maxOutside,
        canvasZ ?? global.get(node.id) ?? 0,
      );
    }
  }
  const elevated = elevateSubtreeBand(allNodes, subsetIds, maxOutside + 1);
  return enforceAncestorDescendantZOrder(allNodes, elevated);
}

function getStrictAncestorIds(
  nodeId: string,
  nodesById: Map<string, PlanningNode>,
): string[] {
  const ancestors: string[] = [];
  let current = nodesById.get(nodeId)?.parentId;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    ancestors.push(current);
    current = nodesById.get(current)?.parentId;
  }
  return ancestors;
}

function isDescendantOf(
  nodeId: string,
  ancestorId: string,
  nodesById: Map<string, PlanningNode>,
): boolean {
  let current = nodesById.get(nodeId)?.parentId;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    if (current === ancestorId) {
      return true;
    }
    seen.add(current);
    current = nodesById.get(current)?.parentId;
  }
  return false;
}

function getSiblingIds(
  endpointId: string,
  nodes: PlanningNode[],
  nodesById: Map<string, PlanningNode>,
): string[] {
  const parentId = nodesById.get(endpointId)?.parentId;
  if (!parentId) {
    return [];
  }
  return nodes
    .filter((n) => n.parentId === parentId && n.id !== endpointId)
    .map((n) => n.id);
}

/** Parent of the deeper endpoint — defines the nested branch for exterior z rules. */
function pickBranchParentId(
  sourceId: string,
  targetId: string,
  nodesById: Map<string, PlanningNode>,
): string | undefined {
  const sourceDepth = nodeDepth(sourceId, nodesById);
  const targetDepth = nodeDepth(targetId, nodesById);
  const deeperId = sourceDepth >= targetDepth ? sourceId : targetId;
  return nodesById.get(deeperId)?.parentId;
}

/**
 * Layered edge stacking: below both endpoints, above crossed ancestor containers.
 * Labels use edge z + 1 (still below endpoint nodes when gap >= 2).
 */
export function computeEdgeZIndexes(
  edges: PlanningEdge[],
  nodeZById: Map<string, number>,
  nodes: PlanningNode[],
): Map<string, number> {
  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const out = new Map<string, number>();

  for (const edge of edges) {
    const sourceZ = nodeZById.get(edge.source) ?? 0;
    const targetZ = nodeZById.get(edge.target) ?? 0;
    const belowSource = sourceZ - EDGE_BELOW_ENDPOINT_GAP;
    const belowTarget = targetZ - EDGE_BELOW_ENDPOINT_GAP;
    let z = Math.min(belowSource, belowTarget);

    const ancestorIds = new Set<string>();
    for (const id of getStrictAncestorIds(edge.source, nodesById)) {
      ancestorIds.add(id);
    }
    for (const id of getStrictAncestorIds(edge.target, nodesById)) {
      ancestorIds.add(id);
    }
    for (const ancestorId of ancestorIds) {
      if (ancestorId === edge.source || ancestorId === edge.target) {
        continue;
      }
      z = Math.max(
        z,
        (nodeZById.get(ancestorId) ?? 0) + EDGE_ABOVE_CROSSED_ANCESTOR_GAP,
      );
    }

    const ceilingCandidates = [belowSource, belowTarget];
    for (const endpointId of [edge.source, edge.target]) {
      for (const siblingId of getSiblingIds(endpointId, nodes, nodesById)) {
        ceilingCandidates.push((nodeZById.get(siblingId) ?? 0) - EDGE_BELOW_ENDPOINT_GAP);
      }
    }

    const branchParentId = pickBranchParentId(
      edge.source,
      edge.target,
      nodesById,
    );
    if (branchParentId) {
      for (const node of nodes) {
        if (
          node.id === edge.source ||
          node.id === edge.target ||
          ancestorIds.has(node.id)
        ) {
          continue;
        }
        if (isDescendantOf(node.id, branchParentId, nodesById)) {
          continue;
        }
        ceilingCandidates.push(
          (nodeZById.get(node.id) ?? 0) - EDGE_BELOW_ENDPOINT_GAP,
        );
      }
    }

    z = Math.min(z, ...ceilingCandidates);
    out.set(edge.id, z);
  }

  return out;
}
