export const PALETTE_WIDTH_STORAGE_KEY = "agent-visual-tool.paletteWidth";
export const PALETTE_WIDTH_DEFAULT = 200;
export const PALETTE_WIDTH_MIN = 160;
export const PALETTE_WIDTH_MAX = 520;

export function clampPaletteWidth(width: number): number {
  return Math.min(PALETTE_WIDTH_MAX, Math.max(PALETTE_WIDTH_MIN, width));
}

export function readStoredPaletteWidth(): number {
  if (typeof window === "undefined") {
    return PALETTE_WIDTH_DEFAULT;
  }
  const raw = window.localStorage.getItem(PALETTE_WIDTH_STORAGE_KEY);
  if (raw === null) {
    return PALETTE_WIDTH_DEFAULT;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return PALETTE_WIDTH_DEFAULT;
  }
  return clampPaletteWidth(parsed);
}

export function writeStoredPaletteWidth(width: number): void {
  window.localStorage.setItem(
    PALETTE_WIDTH_STORAGE_KEY,
    String(clampPaletteWidth(width)),
  );
}
