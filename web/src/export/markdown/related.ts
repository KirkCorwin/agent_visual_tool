import type { EdgeType, PlanningEdge, PlanningGraph, PlanningNode } from "../../graph/types";
import { linkToNode } from "../paths";

const EDGE_LABELS: Record<EdgeType, string> = {
  depends_on: "depends on",
  implements: "implements",
  assigned_to: "assigned to",
  references: "references",
};

type RelatedEntry = {
  edgeType: EdgeType;
  label?: string;
  isCustom?: boolean;
  node: PlanningNode;
  direction: "outbound" | "inbound";
};

function collectRelated(
  graph: PlanningGraph,
  nodeId: string,
): RelatedEntry[] {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const entries: RelatedEntry[] = [];

  for (const edge of graph.edges) {
    if (edge.source === nodeId) {
      const target = nodeById.get(edge.target);
      if (target) {
        entries.push({
          edgeType: edge.type,
          label: edge.data?.label,
          isCustom: edge.data?.isCustom,
          node: target,
          direction: "outbound",
        });
      }
    }
    if (edge.target === nodeId) {
      const source = nodeById.get(edge.source);
      if (source) {
        entries.push({
          edgeType: edge.type,
          label: edge.data?.label,
          isCustom: edge.data?.isCustom,
          node: source,
          direction: "inbound",
        });
      }
    }
  }

  return entries;
}

function formatEntry(
  entry: RelatedEntry,
  fromFile: string,
  pathByNodeId: Map<string, string>,
): string {
  const arrow = entry.direction === "outbound" ? "→" : "←";
  const link = linkToNode(fromFile, entry.node, pathByNodeId);
  const edgeName = EDGE_LABELS[entry.edgeType];
  const relation =
    entry.isCustom && entry.label?.trim()
      ? `custom (${entry.label.trim()})`
      : `**${entry.edgeType}** (${edgeName})`;
  const note =
    !entry.isCustom && entry.label?.trim() ? ` — _${entry.label.trim()}_` : "";
  return `- ${relation} ${arrow} ${link} (${entry.node.type})${note}`;
}

export function renderRelatedSection(
  graph: PlanningGraph,
  node: PlanningNode,
  fromFile: string,
  pathByNodeId: Map<string, string>,
): string {
  const entries = collectRelated(graph, node.id);
  if (entries.length === 0) {
    return "## Related\n\n_No connections in the graph._\n";
  }

  const outbound = entries.filter((e) => e.direction === "outbound");
  const inbound = entries.filter((e) => e.direction === "inbound");

  let body = "## Related\n\n";

  if (outbound.length > 0) {
    body += "### Outbound\n\n";
    body += outbound.map((e) => formatEntry(e, fromFile, pathByNodeId)).join("\n");
    body += "\n\n";
  }

  if (inbound.length > 0) {
    body += "### Inbound\n\n";
    body += inbound.map((e) => formatEntry(e, fromFile, pathByNodeId)).join("\n");
    body += "\n\n";
  }

  return body;
}

export function edgeSummary(edge: PlanningEdge): string {
  return EDGE_LABELS[edge.type];
}
