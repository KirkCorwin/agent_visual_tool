import type { PlanningGraph, PlanningNode } from "../../graph/types";
import { linkToNode } from "../paths";
import { nodeAnchor, sectionTitle } from "./format";

export function renderFolderReadme(
  folder: PlanningNode,
  graph: PlanningGraph,
  pathByNodeId: Map<string, string>,
): string {
  const fromFile = pathByNodeId.get(folder.id) ?? "";
  const members = graph.nodes.filter((n) => n.parentId === folder.id);
  const lines = [
    `# ${folder.data.title}`,
    "",
    nodeAnchor(folder),
    "",
    "Folder container for grouped planning artifacts.",
    "",
  ];
  if (folder.data.description?.trim()) {
    lines.push(folder.data.description.trim(), "");
  }
  lines.push(sectionTitle("Contents"));
  if (members.length === 0) {
    lines.push("_Drag nodes into this folder on the canvas._\n");
  } else {
    for (const member of members) {
      lines.push(`- ${linkToNode(fromFile, member, pathByNodeId)} (${member.type})`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
