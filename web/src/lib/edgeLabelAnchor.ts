import { getBezierPath, Position, type XYPosition } from "@xyflow/react";

/** Half-size of the edge label box used for anchor math (flow px). */
export const EDGE_LABEL_HALF_WIDTH = 52;
export const EDGE_LABEL_HALF_HEIGHT = 18;

export function rectBorderPoint(
  centerX: number,
  centerY: number,
  halfW: number,
  halfH: number,
  towardX: number,
  towardY: number,
): XYPosition & { position: Position } {
  const dx = towardX - centerX;
  const dy = towardY - centerY;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
    return { x: centerX, y: centerY - halfH, position: Position.Top };
  }
  const scale = 1 / Math.max(Math.abs(dx) / halfW, Math.abs(dy) / halfH);
  const x = centerX + dx * scale;
  const y = centerY + dy * scale;
  const position =
    Math.abs(dx) / halfW >= Math.abs(dy) / halfH
      ? dx > 0
        ? Position.Right
        : Position.Left
      : dy > 0
        ? Position.Bottom
        : Position.Top;
  return { x, y, position };
}

function oppositePosition(position: Position): Position {
  switch (position) {
    case Position.Top:
      return Position.Bottom;
    case Position.Bottom:
      return Position.Top;
    case Position.Left:
      return Position.Right;
    case Position.Right:
      return Position.Left;
    default:
      return Position.Top;
  }
}

/** Smooth path: source node → label box → target node. */
export function buildEdgePathThroughLabel(params: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  labelX: number;
  labelY: number;
  halfW?: number;
  halfH?: number;
}): string {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    labelX,
    labelY,
    halfW = EDGE_LABEL_HALF_WIDTH,
    halfH = EDGE_LABEL_HALF_HEIGHT,
  } = params;

  const towardSource = rectBorderPoint(
    labelX,
    labelY,
    halfW,
    halfH,
    sourceX,
    sourceY,
  );
  const towardTarget = rectBorderPoint(
    labelX,
    labelY,
    halfW,
    halfH,
    targetX,
    targetY,
  );

  const [leg1] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX: towardSource.x,
    targetY: towardSource.y,
    targetPosition: oppositePosition(towardSource.position),
  });

  const [leg2] = getBezierPath({
    sourceX: towardTarget.x,
    sourceY: towardTarget.y,
    sourcePosition: towardTarget.position,
    targetX,
    targetY,
    targetPosition,
  });

  const leg2Curve = leg2.replace(/^M[^Cc]+/, "").trim();
  return leg2Curve ? `${leg1} ${leg2Curve}` : leg1;
}
