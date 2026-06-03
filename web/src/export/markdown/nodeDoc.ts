import type { PlanningGraph, PlanningNode } from "../../graph/types";
import { linkToNode } from "../paths";
import {
  formatDescription,
  formatNodeMetadata,
  nodeAnchor,
  sectionTitle,
} from "./format";
import { renderRelatedSection } from "./related";

export function renderNodeDocument(
  node: PlanningNode,
  graph: PlanningGraph,
  fromFile: string,
  pathByNodeId: Map<string, string>,
): string {
  const folderNode = node.folderId
    ? graph.nodes.find((n) => n.id === node.folderId)
    : undefined;
  const folderNote =
    folderNode && pathByNodeId.has(folderNode.id)
      ? `\n**Folder:** ${linkToNode(fromFile, folderNode, pathByNodeId)}\n`
      : "";

  const lines = [
    `# ${node.data.title}`,
    "",
    nodeAnchor(node),
    "",
    formatNodeMetadata(node),
    folderNote,
    "",
    sectionTitle("Description"),
    formatDescription(node.data),
    renderRelatedSection(graph, node, fromFile, pathByNodeId),
  ];

  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}
