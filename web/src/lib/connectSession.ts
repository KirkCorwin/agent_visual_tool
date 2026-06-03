/** Document-level pointer end (capture) — React Flow often blocks bubbling mouseup. */
export function listenForConnectPointerEnd(
  onEnd: (event: PointerEvent) => void,
): () => void {
  const handler = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }
    onEnd(event);
  };
  document.addEventListener("pointerup", handler, true);
  document.addEventListener("pointercancel", handler, true);
  return () => {
    document.removeEventListener("pointerup", handler, true);
    document.removeEventListener("pointercancel", handler, true);
  };
}

export function capturePointerOnNode(
  event: React.PointerEvent,
): void {
  const nodeEl = (event.currentTarget as HTMLElement).closest(
    ".react-flow__node",
  );
  if (nodeEl instanceof HTMLElement && "setPointerCapture" in nodeEl) {
    try {
      nodeEl.setPointerCapture(event.pointerId);
    } catch {
      /* ignore if capture fails */
    }
  }
}

export function releasePointerCaptureFromNode(
  event: React.PointerEvent,
): void {
  const nodeEl = (event.currentTarget as HTMLElement).closest(
    ".react-flow__node",
  );
  if (nodeEl instanceof HTMLElement && "releasePointerCapture" in nodeEl) {
    try {
      if (nodeEl.hasPointerCapture(event.pointerId)) {
        nodeEl.releasePointerCapture(event.pointerId);
      }
    } catch {
      /* ignore */
    }
  }
}
