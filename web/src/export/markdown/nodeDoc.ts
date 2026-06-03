import { applyPromptTemplate } from "../../graph/defaultPrompts";
import type { EditorConfig } from "../../graph/editorConfig";
import { DEFAULT_EDITOR_CONFIG } from "../../graph/editorConfig";
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
  editorConfig: EditorConfig = DEFAULT_EDITOR_CONFIG,
): string {
  const folderNode = node.folderId
    ? graph.nodes.find((n) => n.id === node.folderId)
    : undefined;
  const folderNote =
    folderNode && pathByNodeId.has(folderNode.id)
      ? `\n**Folder:** ${linkToNode(fromFile, folderNode, pathByNodeId)}\n`
      : "";

  const customTypeId =
    node.type === "custom" ? node.data.customTypeId : undefined;
  const customType = customTypeId
    ? graph.customNodeTypes?.find((t) => t.id === customTypeId)
    : undefined;
  const promptTemplate =
    node.type === "custom" && customTypeId
      ? editorConfig.customPromptsByTypeId[customTypeId]
      : editorConfig.nodePrompts[node.type];
  const promptBlock = promptTemplate
    ? applyPromptTemplate(promptTemplate, {
        title: node.data.title,
        type: node.type,
        customLabel: customType?.label ?? "Custom",
        graphJsonPath: "graph.json",
        bootstrapPath: "prompts/bootstrap.md",
        packageRoot: ".",
      })
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
    promptBlock ? `\n${promptBlock}\n` : "",
    renderRelatedSection(graph, node, fromFile, pathByNodeId),
  ];

  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}
