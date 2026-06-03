import { toPng } from "html-to-image";

import type { PlanningGraph } from "../graph/types";
import { projectFileSlug } from "./fileIO";

const CAPTURE_BACKGROUND = "#0d0f14";

/** Filename for a PNG of the current on-screen graph viewport. */
export function graphCanvasPngFileName(graph: PlanningGraph): string {
  return `${projectFileSlug(graph.meta.name, "graph")}-canvas.png`;
}

function shouldIncludeInCapture(node: Node): boolean {
  if (!(node instanceof HTMLElement)) {
    return true;
  }
  const el = node;
  if (el.classList.contains("react-flow__minimap")) {
    return false;
  }
  if (el.classList.contains("react-flow__controls")) {
    return false;
  }
  if (el.classList.contains("canvas-empty")) {
    return false;
  }
  if (el.classList.contains("connect-banner")) {
    return false;
  }
  if (el.classList.contains("connect-draft-line")) {
    return false;
  }
  return true;
}

/** Rasterize the visible graph canvas (current pan/zoom) as PNG. */
export async function captureGraphViewPng(
  root: HTMLElement,
): Promise<Blob> {
  const flowRoot =
    root.querySelector<HTMLElement>(".react-flow") ?? root;
  const dataUrl = await toPng(flowRoot, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: CAPTURE_BACKGROUND,
    filter: shouldIncludeInCapture,
  });
  const response = await fetch(dataUrl);
  return response.blob();
}
