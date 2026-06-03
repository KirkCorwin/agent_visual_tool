import type { EditorConfig } from "../graph/editorConfig";
import { DEFAULT_EDITOR_CONFIG } from "../graph/editorConfig";
import type { PlanningEdge, PlanningGraph, PlanningNode } from "../graph/types";
import { projectFileSlug } from "../lib/fileIO";
import { formatEdgeType, isCustomEdge } from "../lib/edgeDisplay";
import {
  getTaskExecutionOrder,
  renderBootstrapPrompt,
} from "./bootstrapPrompt";
import { buildPathByNodeId } from "./paths";

export const SINGLE_MARKDOWN_FILENAME = "project-brief.md";

export function singleMarkdownFileName(graph: PlanningGraph): string {
  return `${projectFileSlug(graph.meta.name, "project")}-brief.md`;
}

function nodeRef(node: PlanningNode): string {
  const title = node.data.title.trim() || node.id;
  let line = `**${title}** (${node.type})`;
  if (node.data.role?.trim()) {
    line += ` — role: ${node.data.role.trim()}`;
  }
  if (node.data.status) {
    line += ` — status: ${node.data.status}`;
  }
  if (node.data.description?.trim()) {
    line += `\n  - ${node.data.description.trim()}`;
  }
  return line;
}

function formatEdgeRelation(edge: PlanningEdge): string {
  if (isCustomEdge(edge) && edge.data?.label?.trim()) {
    return `custom (${edge.data.label.trim()})`;
  }
  return formatEdgeType(edge.type);
}

function renderGraphNodes(graph: PlanningGraph): string {
  const lines = ["## All nodes", ""];
  if (graph.nodes.length === 0) {
    lines.push("_No nodes in the graph._", "");
    return lines.join("\n");
  }

  const byType = new Map<string, PlanningNode[]>();
  for (const node of graph.nodes) {
    const list = byType.get(node.type) ?? [];
    list.push(node);
    byType.set(node.type, list);
  }

  for (const [type, nodes] of [...byType.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    lines.push(`### ${type}`, "");
    for (const node of nodes) {
      lines.push(`- ${nodeRef(node)}`);
      if (node.folderId) {
        const folder = graph.nodes.find((n) => n.id === node.folderId);
        if (folder) {
          lines.push(`  - In folder: ${folder.data.title}`);
        }
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

function renderGraphConnections(graph: PlanningGraph): string {
  const lines = ["## Connections", ""];
  if (graph.edges.length === 0) {
    lines.push("_No edges in the graph._", "");
    return lines.join("\n");
  }

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  for (const edge of graph.edges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    const sourceLabel = source?.data.title ?? edge.source;
    const targetLabel = target?.data.title ?? edge.target;
    const relation = formatEdgeRelation(edge);
    lines.push(
      `- **${sourceLabel}** (${source?.type ?? "?"}) → *${relation}* → **${targetLabel}** (${target?.type ?? "?"})`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

/** One markdown file: bootstrap prompt + full node list + connection graph. */
export function renderSingleMarkdownBrief(
  graph: PlanningGraph,
  editorConfig: EditorConfig = DEFAULT_EDITOR_CONFIG,
): string {
  const pathByNodeId = buildPathByNodeId(graph);
  const bootstrap = renderBootstrapPrompt(
    graph,
    pathByNodeId,
    ["planning/README.md", "graph.json"],
    editorConfig,
  );

  const lines = [
    `# ${graph.meta.name} — planning brief`,
    "",
    "Single-file export from the agent visual planning tool. Use this document",
    "as the full context for generating or extending the project.",
    "",
    "---",
    "",
    bootstrap.trimEnd(),
    "",
    "---",
    "",
    renderGraphNodes(graph).trimEnd(),
    "",
    renderGraphConnections(graph).trimEnd(),
    "",
    "## Task order (reference)",
    "",
  ];

  const ordered = getTaskExecutionOrder(graph);
  if (ordered.length === 0) {
    lines.push("_No tasks in the graph._", "");
  } else {
    ordered.forEach((task, index) => {
      lines.push(`${index + 1}. ${nodeRef(task)}`);
    });
    lines.push("");
  }

  lines.push(
    `_Exported at ${graph.meta.updatedAt} · ${graph.nodes.length} nodes · ${graph.edges.length} connections._`,
    "",
  );

  return lines.join("\n");
}
