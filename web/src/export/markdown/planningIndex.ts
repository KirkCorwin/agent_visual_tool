import type { NodeType, PlanningGraph, PlanningNode } from "../../graph/types";
import { linkToNode } from "../paths";
export { buildPathByNodeId } from "../paths";
import { nodeTypeHeading } from "./format";

const INDEX_SECTION_ORDER: NodeType[] = [
  "project",
  "folder",
  "requirement",
  "feature",
  "component",
  "decision",
  "constraint",
  "task",
  "agent",
];

function listNodes(
  nodes: PlanningNode[],
  nodeType: NodeType,
  fromFile: string,
  pathByNodeId: Map<string, string>,
): string {
  const filtered = nodes.filter((n) => n.type === nodeType);
  if (filtered.length === 0) {
    return "";
  }
  const items = filtered
    .map((n) => `- ${linkToNode(fromFile, n, pathByNodeId)}`)
    .join("\n");
  return `## ${nodeTypeHeading(nodeType)}s\n\n${items}\n\n`;
}

export function renderPlanningIndex(
  graph: PlanningGraph,
  pathByNodeId: Map<string, string>,
): string {
  const fromFile = "planning/README.md";
  const lines = [
    "# Planning package",
    "",
    `Generated from **${graph.meta.name}**.`,
    "",
    `Canonical graph: [graph.json](../graph.json)`,
    "",
    "_All paths below are relative to this planning index._",
    "",
  ];

  for (const nodeType of INDEX_SECTION_ORDER) {
    const section = listNodes(graph.nodes, nodeType, fromFile, pathByNodeId);
    if (section) {
      lines.push(section);
    }
  }

  lines.push("## File index\n\n");
  const sortedPaths = [...pathByNodeId.entries()].sort((a, b) =>
    a[1].localeCompare(b[1]),
  );
  for (const [id, path] of sortedPaths) {
    const node = graph.nodes.find((n) => n.id === id);
    if (!node) {
      continue;
    }
    const href = relativeFromPlanningReadme(path);
    lines.push(`- [${node.data.title}](${href}) — \`${path}\``);
  }
  lines.push("");

  return lines.join("\n");
}

function relativeFromPlanningReadme(targetPath: string): string {
  return targetPath.startsWith("planning/")
    ? targetPath.slice("planning/".length)
    : `../${targetPath}`;
}
