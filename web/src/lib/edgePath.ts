import { getBezierPath, type Position } from "@xyflow/react";
import { DEFAULT_EDGE_CURVATURE } from "./edgeBundleLayout";
import { buildEdgePathThroughLabel } from "./edgeLabelAnchor";

export type EdgePathResult = {
  path: string;
  labelX: number;
  labelY: number;
};

export function resolveAdaptiveCurvature(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  bundleCurvature: number = DEFAULT_EDGE_CURVATURE,
): number {
  const dx = Math.abs(targetX - sourceX);
  const dy = Math.abs(targetY - sourceY);
  const len = Math.hypot(dx, dy);
  if (len < 1) {
    return bundleCurvature;
  }

  const verticalDominant = dy > dx * 0.85;
  if (!verticalDominant) {
    return bundleCurvature;
  }

  const verticalRatio = dy / (dx + 48);
  const boost = Math.min(verticalRatio * 0.22, 0.55);
  return bundleCurvature + boost;
}

type BezierEndpoints = {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
};

/** Nudge one scalar curvature so the arc midpoint hugs a dragged label (single smooth cubic). */
export function resolveCurvatureTowardLabel(
  endpoints: BezierEndpoints,
  baseCurvature: number,
  labelX: number,
  labelY: number,
): number {
  const min = Math.max(0.08, baseCurvature - 1.25);
  const max = baseCurvature + 1.25;
  let best = baseCurvature;
  let bestDist = Infinity;
  const steps = 40;

  for (let i = 0; i <= steps; i++) {
    const curvature = min + ((max - min) * i) / steps;
    const [, midX, midY] = getBezierPath({
      ...endpoints,
      curvature,
    });
    const dist = (midX - labelX) ** 2 + (midY - labelY) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = curvature;
    }
  }

  return best;
}

const LABEL_DRAG_CURVE_THRESHOLD = 4;

export function shouldBendCurveForLabelDrag(
  labelDrag?: { dx: number; dy: number },
): boolean {
  if (!labelDrag) {
    return false;
  }
  return Math.hypot(labelDrag.dx, labelDrag.dy) >= LABEL_DRAG_CURVE_THRESHOLD;
}

export function resolveEdgePath(params: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  curvature: number;
  labelDrag?: { dx: number; dy: number };
  bundleLabelOffsetPx: number;
  /** When true, path attaches to the label box and updates as the label moves. */
  edgeFollowsLabel?: boolean;
}): EdgePathResult & { defaultLabelX: number; defaultLabelY: number } {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature,
    labelDrag,
    bundleLabelOffsetPx,
    edgeFollowsLabel = false,
  } = params;

  const endpoints: BezierEndpoints = {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  };

  const adaptiveCurvature = resolveAdaptiveCurvature(
    sourceX,
    sourceY,
    targetX,
    targetY,
    curvature,
  );

  const [, baseLabelX, baseLabelY] = getBezierPath({
    ...endpoints,
    curvature: adaptiveCurvature,
  });

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.hypot(dx, dy);
  let defaultLabelX = baseLabelX;
  let defaultLabelY = baseLabelY;
  if (len >= 1e-6 && bundleLabelOffsetPx !== 0) {
    const nx = -dy / len;
    const ny = dx / len;
    defaultLabelX += nx * bundleLabelOffsetPx;
    defaultLabelY += ny * bundleLabelOffsetPx;
  }

  const dragDx = labelDrag?.dx ?? 0;
  const dragDy = labelDrag?.dy ?? 0;
  const labelX = defaultLabelX + dragDx;
  const labelY = defaultLabelY + dragDy;

  const bendCurve =
    edgeFollowsLabel && shouldBendCurveForLabelDrag(labelDrag);
  const pathCurvature = bendCurve
    ? resolveCurvatureTowardLabel(endpoints, adaptiveCurvature, labelX, labelY)
    : adaptiveCurvature;

  const path = edgeFollowsLabel
    ? buildEdgePathThroughLabel({
        ...endpoints,
        labelX,
        labelY,
      })
    : getBezierPath({
        ...endpoints,
        curvature: pathCurvature,
      })[0];

  return {
    path,
    labelX,
    labelY,
    defaultLabelX,
    defaultLabelY,
  };
}
