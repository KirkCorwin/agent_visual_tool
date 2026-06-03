import { MarkerType, type EdgeMarker } from "@xyflow/react";

/**
 * Arrowhead at the target (what is depended on). Edge runs source → target where
 * source is the dependent (e.g. connect from Task to Feature = Task depends on Feature).
 */
export const PLANNING_EDGE_MARKER_END: EdgeMarker = {
  type: MarkerType.ArrowClosed,
  width: 20,
  height: 20,
  color: "#9aa0a6",
};

export const PLANNING_EDGE_MARKER_END_SELECTED: EdgeMarker = {
  ...PLANNING_EDGE_MARKER_END,
  color: "#e8eaed",
};
