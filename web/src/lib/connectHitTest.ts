import type { PlanningGraph } from "../graph/types";

/** All React Flow node ids under the pointer, topmost first. */
export function collectNodeIdsAtPointer(
  clientX: number,
  clientY: number,
): string[] {
  const elements = document.elementsFromPoint(clientX, clientY);
  const ids: string[] = [];
  for (const element of elements) {
    const nodeEl = element.closest(".react-flow__node[data-id]");
    if (!nodeEl) {
      continue;
    }
    const id = nodeEl.getAttribute("data-id");
    if (id && !ids.includes(id)) {
      ids.push(id);
    }
  }
  return ids;
}

/**
 * Pick a connect target from hit-tested node ids (topmost first).
 * Prefer a non-folder node over a folder when both overlap.
 */
export function pickConnectTargetFromIds(
  candidateIds: string[],
  graph: PlanningGraph,
  sourceId: string,
): string | null {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const candidates = candidateIds.filter((id) => id !== sourceId);
  if (candidates.length === 0) {
    return null;
  }

  const nonFolder = candidates.filter(
    (id) => nodeById.get(id)?.type !== "folder",
  );
  if (nonFolder.length > 0) {
    return nonFolder[0];
  }

  return candidates.find((id) => nodeById.get(id)?.type === "folder") ?? null;
}

/**
 * Pick a connect target: prefer a non-folder node over a folder when both
 * overlap (e.g. object inside a folder). Folder is only chosen when it is the
 * only node under the pointer (empty folder area).
 */
export function resolveConnectTargetAtPointer(
  clientX: number,
  clientY: number,
  graph: PlanningGraph,
  sourceId: string,
): string | null {
  return pickConnectTargetFromIds(
    collectNodeIdsAtPointer(clientX, clientY),
    graph,
    sourceId,
  );
}

/** @deprecated Use resolveConnectTargetAtPointer */
export function getNodeIdAtPointer(
  clientX: number,
  clientY: number,
): string | null {
  return collectNodeIdsAtPointer(clientX, clientY)[0] ?? null;
}
