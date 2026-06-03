import type { EdgeType, PlanningEdge } from "../graph/types";

export const CUSTOM_EDGE_OPTION = "custom" as const;

export function formatEdgeType(type: EdgeType): string {
  return type.replace(/_/g, " ");
}

export function isCustomEdge(edge: PlanningEdge): boolean {
  return edge.data?.isCustom === true;
}

export function getEdgeTypeMenuValue(edge: PlanningEdge): EdgeType | typeof CUSTOM_EDGE_OPTION {
  return isCustomEdge(edge) ? CUSTOM_EDGE_OPTION : edge.type;
}

/** Primary title on the edge label chip (type name or "custom"). */
export function getEdgeTitleLabel(edge: PlanningEdge): string {
  if (isCustomEdge(edge)) {
    return "custom";
  }
  return formatEdgeType(edge.type);
}

/** Text shown on the canvas when not editing the dropdown card. */
export function getEdgeCanvasSummary(edge: PlanningEdge): string {
  if (isCustomEdge(edge) && edge.data?.label?.trim()) {
    return edge.data.label.trim();
  }
  return getEdgeTitleLabel(edge);
}

/** Single-letter chip when minimal edge labels are enabled. */
export function getEdgeMinimalLetter(edge: PlanningEdge): string {
  if (isCustomEdge(edge)) {
    const text = edge.data?.label?.trim();
    if (text) {
      return text.charAt(0).toUpperCase();
    }
    return "C";
  }
  return formatEdgeType(edge.type).charAt(0).toUpperCase();
}
