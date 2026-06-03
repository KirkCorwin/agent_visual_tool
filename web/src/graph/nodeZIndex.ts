import { getFolderSize, getPlanningNodeSize } from "./folderBounds";
import type { PlanningNode } from "./types";

const FOLDER_STEP = 2;
const PLANNING_STEP = 10;

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
): Map<string, number> {
  const global = computeStackZIndexes(allNodes);
  let maxOutside = 0;
  for (const node of allNodes) {
    if (!subsetIds.has(node.id)) {
      maxOutside = Math.max(maxOutside, global.get(node.id) ?? 0);
    }
  }
  return elevateSubtreeBand(allNodes, subsetIds, maxOutside + 1);
}
