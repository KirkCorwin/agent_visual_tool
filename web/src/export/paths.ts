import type { NodeType, PlanningGraph, PlanningNode } from "../graph/types";
import { folderExportSlug } from "../graph/folderBounds";

const PLANNING_NODE_DIRS: Record<
  Exclude<NodeType, "task" | "agent" | "folder">,
  string
> = {
  project: "planning/project",
  requirement: "planning/requirements",
  feature: "planning/features",
  component: "planning/components",
  decision: "planning/decisions",
  constraint: "planning/constraints",
};

function basePathForType(nodeType: NodeType, nodeId: string): string {
  if (nodeType === "task") {
    return `tasks/${nodeId}.md`;
  }
  if (nodeType === "agent") {
    return `agents/${nodeId}.md`;
  }
  if (nodeType === "folder") {
    return `folders/${nodeId}/README.md`;
  }
  return `${PLANNING_NODE_DIRS[nodeType]}/${nodeId}.md`;
}

export function nodeExportPath(
  node: PlanningNode,
  graph: PlanningGraph,
): string {
  if (node.type === "folder") {
    const folder = graph.nodes.find((n) => n.id === node.id && n.type === "folder");
    const slug = folder ? folderExportSlug(folder) : node.id;
    return `folders/${slug}/README.md`;
  }

  const base = basePathForType(node.type, node.id);
  if (!node.folderId) {
    return base;
  }

  const folder = graph.nodes.find(
    (n) => n.id === node.folderId && n.type === "folder",
  );
  if (!folder) {
    return base;
  }

  const prefix = `folders/${folderExportSlug(folder)}`;
  if (node.type === "task") {
    return `${prefix}/tasks/${node.id}.md`;
  }
  if (node.type === "agent") {
    return `${prefix}/agents/${node.id}.md`;
  }
  const segment = base.split("/").slice(1).join("/");
  return `${prefix}/${segment}`;
}

export function buildPathByNodeId(graph: PlanningGraph): Map<string, string> {
  const map = new Map<string, string>();
  for (const node of graph.nodes) {
    map.set(node.id, nodeExportPath(node, graph));
  }
  return map;
}

export function relativePath(fromFile: string, toFile: string): string {
  const fromParts = fromFile.split("/");
  const toParts = toFile.split("/");
  fromParts.pop();
  let shared = 0;
  while (
    shared < fromParts.length &&
    shared < toParts.length &&
    fromParts[shared] === toParts[shared]
  ) {
    shared += 1;
  }
  const ups = fromParts.length - shared;
  const prefix = ups === 0 ? "./" : `${"../".repeat(ups)}`;
  const rest = toParts.slice(shared).join("/");
  return prefix + rest;
}

export function linkToNode(
  fromFile: string,
  target: PlanningNode,
  pathByNodeId: Map<string, string>,
): string {
  const targetPath = pathByNodeId.get(target.id);
  if (!targetPath) {
    return target.data.title;
  }
  const href = relativePath(fromFile, targetPath);
  return `[${target.data.title}](${href})`;
}
