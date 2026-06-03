import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import {
  clampPaletteWidth,
  PALETTE_WIDTH_DEFAULT,
  readStoredPaletteWidth,
  writeStoredPaletteWidth,
} from "../../lib/paletteWidth";

type ResizablePaletteShellProps = {
  children: ReactNode;
};

export function ResizablePaletteShell({ children }: ResizablePaletteShellProps) {
  const [width, setWidth] = useState(readStoredPaletteWidth);
  const [isResizing, setIsResizing] = useState(false);
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(PALETTE_WIDTH_DEFAULT);

  const onResizerPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    resizingRef.current = true;
    setIsResizing(true);
    startXRef.current = event.clientX;
    startWidthRef.current = width;
    event.currentTarget.setPointerCapture(event.pointerId);

    const onMove = (ev: PointerEvent) => {
      if (!resizingRef.current) {
        return;
      }
      const delta = ev.clientX - startXRef.current;
      setWidth(clampPaletteWidth(startWidthRef.current + delta));
    };

    const onUp = (ev: PointerEvent) => {
      if (!resizingRef.current) {
        return;
      }
      resizingRef.current = false;
      setIsResizing(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      const delta = ev.clientX - startXRef.current;
      const next = clampPaletteWidth(startWidthRef.current + delta);
      setWidth(next);
      writeStoredPaletteWidth(next);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  useEffect(() => {
    return () => {
      resizingRef.current = false;
    };
  }, []);

  const onResizerKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      let next = width;
      if (event.key === "ArrowRight") {
        next = clampPaletteWidth(width + 8);
      } else if (event.key === "ArrowLeft") {
        next = clampPaletteWidth(width - 8);
      } else {
        return;
      }
      event.preventDefault();
      setWidth(next);
      writeStoredPaletteWidth(next);
    },
    [width],
  );

  return (
    <div
      className={`palette-shell${isResizing ? " palette-shell--resizing" : ""}`}
      style={{ width }}
    >
      {children}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize node palette"
        aria-valuemin={160}
        aria-valuemax={520}
        aria-valuenow={width}
        tabIndex={0}
        className="palette-shell__resizer"
        onPointerDown={onResizerPointerDown}
        onKeyDown={onResizerKeyDown}
      />
    </div>
  );
}
