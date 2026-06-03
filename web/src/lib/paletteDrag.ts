import { NODE_TYPES, type NodeType } from "../graph/types";

export const PALETTE_DRAG_MIME = "application/x-agent-visual-node-type";
export const PALETTE_CUSTOM_PREFIX = "custom:";

export type PaletteDragPayload =
  | { kind: "builtin"; nodeType: NodeType }
  | { kind: "custom"; customTypeId: string };

/** Fallback when dataTransfer is empty on drop (common with custom MIME types). */
let activePaletteDrag: PaletteDragPayload | null = null;

export function isPaletteNodeType(value: string): value is NodeType {
  return (NODE_TYPES as readonly string[]).includes(value);
}

function parseDragToken(token: string): PaletteDragPayload | null {
  if (isPaletteNodeType(token)) {
    return { kind: "builtin", nodeType: token };
  }
  if (token.startsWith(PALETTE_CUSTOM_PREFIX)) {
    const customTypeId = token.slice(PALETTE_CUSTOM_PREFIX.length);
    if (customTypeId) {
      return { kind: "custom", customTypeId };
    }
  }
  return null;
}

export function beginPaletteDrag(payload: PaletteDragPayload): void {
  activePaletteDrag = payload;
}

export function endPaletteDrag(): void {
  activePaletteDrag = null;
}

export function takePaletteDrag(): PaletteDragPayload | null {
  const payload = activePaletteDrag;
  activePaletteDrag = null;
  return payload;
}

export function paletteDragToken(payload: PaletteDragPayload): string {
  if (payload.kind === "builtin") {
    return payload.nodeType;
  }
  return `${PALETTE_CUSTOM_PREFIX}${payload.customTypeId}`;
}

export function setPaletteDragData(
  dataTransfer: DataTransfer,
  payload: PaletteDragPayload,
): void {
  beginPaletteDrag(payload);
  const token = paletteDragToken(payload);
  dataTransfer.setData(PALETTE_DRAG_MIME, token);
  dataTransfer.setData("text/plain", token);
  dataTransfer.effectAllowed = "move";
}

export function getPaletteDragPayload(
  dataTransfer: DataTransfer,
): PaletteDragPayload | null {
  const custom = dataTransfer.getData(PALETTE_DRAG_MIME);
  const fromCustom = parseDragToken(custom);
  if (fromCustom) {
    return fromCustom;
  }
  const plain = dataTransfer.getData("text/plain");
  const fromPlain = parseDragToken(plain);
  if (fromPlain) {
    return fromPlain;
  }
  return takePaletteDrag();
}

/** @deprecated use getPaletteDragPayload */
export function getPaletteDragType(
  dataTransfer: DataTransfer,
): NodeType | null {
  const payload = getPaletteDragPayload(dataTransfer);
  if (!payload) {
    return null;
  }
  if (payload.kind === "builtin") {
    return payload.nodeType;
  }
  return "custom";
}

export function isPaletteDragActive(dataTransfer: DataTransfer): boolean {
  if (activePaletteDrag) {
    return true;
  }
  const types = dataTransfer.types;
  if (typeof types.includes === "function") {
    return (
      types.includes(PALETTE_DRAG_MIME) || types.includes("text/plain")
    );
  }
  return Array.from(types).some(
    (t) => t === PALETTE_DRAG_MIME || t === "text/plain",
  );
}
