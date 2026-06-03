import type { PlanningNode } from "./types";

export const DEFAULT_FOLDER_WIDTH = 300;
export const DEFAULT_FOLDER_HEIGHT = 200;

/** Default planning card size (matches reactFlowAdapter). */
export const PLANNING_NODE_WIDTH = 180;
export const PLANNING_NODE_HEIGHT = 88;
export const PLANNING_NODE_MIN_WIDTH = 160;
export const PLANNING_NODE_MIN_HEIGHT = 72;

/** Approximate center of a default planning card from its top-left position. */
export const NODE_CARD_CENTER_OFFSET = {
  x: PLANNING_NODE_WIDTH / 2,
  y: PLANNING_NODE_HEIGHT / 2,
};

export function getPlanningNodeSize(node: PlanningNode): {
  width: number;
  height: number;
} {
  return {
    width: node.data.width ?? PLANNING_NODE_WIDTH,
    height: node.data.height ?? PLANNING_NODE_HEIGHT,
  };
}

export function getFolderSize(node: PlanningNode): {
  width: number;
  height: number;
} {
  return {
    width: node.data.width ?? DEFAULT_FOLDER_WIDTH,
    height: node.data.height ?? DEFAULT_FOLDER_HEIGHT,
  };
}

export function getFolderRect(node: PlanningNode): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const { width, height } = getFolderSize(node);
  return {
    x: node.position.x,
    y: node.position.y,
    width,
    height,
  };
}

export function pointInFolder(
  point: { x: number; y: number },
  folder: PlanningNode,
): boolean {
  const rect = getFolderRect(folder);
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function findContainingFolder(
  point: { x: number; y: number },
  folders: PlanningNode[],
): PlanningNode | undefined {
  const hits = folders.filter((f) => pointInFolder(point, f));
  if (hits.length === 0) {
    return undefined;
  }
  return hits.sort(
    (a, b) => getFolderSize(a).width * getFolderSize(a).height - getFolderSize(b).width * getFolderSize(b).height,
  )[0];
}

export function folderExportSlug(folder: PlanningNode): string {
  const title =
    folder.data.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "folder";
  return `${title}-${folder.id.slice(0, 8)}`;
}
