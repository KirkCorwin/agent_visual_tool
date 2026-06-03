import { serializePlanningGraph } from "../graph/serialize";
import type { EditorConfig } from "../graph/editorConfig";
import { DEFAULT_EDITOR_CONFIG } from "../graph/editorConfig";
import type { PlanningGraph } from "../graph/types";
import {
  BOOTSTRAP_PROMPT_PATH,
  renderBootstrapPrompt,
} from "./bootstrapPrompt";
import { buildPathByNodeId, nodeExportPath } from "./paths";
import { renderNodeDocument } from "./markdown/nodeDoc";
import { renderFolderReadme } from "./markdown/folderDoc";
import { renderPlanningIndex } from "./markdown/planningIndex";

export const GRAPH_JSON_PATH = "graph.json";

export function buildExportPackage(
  graph: PlanningGraph,
  editorConfig: EditorConfig = DEFAULT_EDITOR_CONFIG,
): Map<string, string> {
  const files = new Map<string, string>();
  const pathByNodeId = buildPathByNodeId(graph);

  for (const node of graph.nodes) {
    const filePath = nodeExportPath(node, graph);
    if (node.type === "folder") {
      files.set(filePath, renderFolderReadme(node, graph, pathByNodeId));
    } else {
      files.set(
        filePath,
        renderNodeDocument(node, graph, filePath, pathByNodeId, editorConfig),
      );
    }
  }

  if (graph.nodes.length > 0) {
    files.set("planning/README.md", renderPlanningIndex(graph, pathByNodeId));
  }

  files.set(GRAPH_JSON_PATH, serializePlanningGraph(graph));

  const pathsBeforeBootstrap = [...files.keys()];
  files.set(
    BOOTSTRAP_PROMPT_PATH,
    renderBootstrapPrompt(graph, pathByNodeId, pathsBeforeBootstrap, editorConfig),
  );

  return files;
}

export function exportPackageFileCount(graph: PlanningGraph): number {
  return buildExportPackage(graph).size;
}
