/**
 * Invisible edge stroke hit targets (below label chips).
 * Was 12 in CSS — that blocked clicks on labels with edgeZ + 1 under 12.
 */
export const EDGE_HIT_OVERLAY_Z_INDEX = 0;

/** Edge label chips render in this layer (above hit overlay, per-label z still applies). */
export const EDGE_LABEL_RENDERER_Z_INDEX = 1;

/** Temporary canvas dropdown menus — always above graph nodes and edges. */
export const CANVAS_DROPDOWN_Z_INDEX = 3000;

/** Floating inline edit fields on the canvas (same band as dropdowns). */
export const FLOATING_FIELD_Z_INDEX = CANVAS_DROPDOWN_Z_INDEX;

/** Modal dialogs (More settings, etc.). */
export const MODAL_Z_INDEX = 4000;

/** `data-*` attribute on portaled dropdown roots for outside-click hit testing. */
export const CANVAS_DROPDOWN_ATTR = "data-canvas-dropdown";
