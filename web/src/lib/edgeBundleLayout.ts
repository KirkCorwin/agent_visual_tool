import type { PlanningEdge } from "../graph/types";

/** Base bezier curvature (default React Flow is 0.25 — higher = wider arc). */
export const DEFAULT_EDGE_CURVATURE = 0.72;

/** Extra curvature per parallel edge in the same source→target bundle. */
export const EDGE_BUNDLE_CURVATURE_STEP = 0.2;

/** Perpendicular label shift (px) so edge chips do not stack. */
export const EDGE_LABEL_OFFSET_STEP = 34;

export type EdgeBundleLayout = {
  bundleIndex: number;
  bundleSize: number;
  curvature: number;
  labelOffsetPx: number;
};

function bundleKey(source: string, target: string): string {
  return `${source}\u0000${target}`;
}

/**
 * Layout parallel edges between the same ordered pair (source → target).
 * Stable sort by edge id so positions do not jump when editing.
 */
export function computeEdgeBundleLayouts(
  edges: PlanningEdge[],
): Map<string, EdgeBundleLayout> {
  const groups = new Map<string, PlanningEdge[]>();

  for (const edge of edges) {
    const key = bundleKey(edge.source, edge.target);
    const list = groups.get(key) ?? [];
    list.push(edge);
    groups.set(key, list);
  }

  const layouts = new Map<string, EdgeBundleLayout>();

  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
    const bundleSize = sorted.length;
    const center = (bundleSize - 1) / 2;

    sorted.forEach((edge, bundleIndex) => {
      const offsetFromCenter = bundleIndex - center;
      layouts.set(edge.id, {
        bundleIndex,
        bundleSize,
        curvature:
          DEFAULT_EDGE_CURVATURE +
          offsetFromCenter * EDGE_BUNDLE_CURVATURE_STEP,
        labelOffsetPx: offsetFromCenter * EDGE_LABEL_OFFSET_STEP,
      });
    });
  }

  return layouts;
}

/** Shift label anchor perpendicular to the chord source→target. */
export function offsetLabelPosition(
  labelX: number,
  labelY: number,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  offsetPx: number,
): { x: number; y: number } {
  if (offsetPx === 0) {
    return { x: labelX, y: labelY };
  }
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return { x: labelX, y: labelY + offsetPx };
  }
  const nx = -dy / len;
  const ny = dx / len;
  return {
    x: labelX + nx * offsetPx,
    y: labelY + ny * offsetPx,
  };
}
