import { useMemo, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

import { FLOATING_FIELD_Z_INDEX } from "../../lib/overlayZIndex";
import { useFixedAnchorRect } from "../../lib/useFixedAnchorRect";

type FloatingFieldPortalProps = {
  anchorRef: RefObject<HTMLElement | null>;
  active: boolean;
  children: ReactNode;
  className?: string;
};

export function floatingFieldStyleFromRect(
  rect: Pick<DOMRect, "top" | "left" | "width">,
): CSSProperties {
  const width = Math.max(rect.width, 48);
  return {
    position: "fixed",
    top: rect.top,
    left: rect.left,
    width,
    maxWidth: `min(${width}px, calc(100vw - ${rect.left}px - 8px))`,
    zIndex: FLOATING_FIELD_Z_INDEX,
    pointerEvents: "auto",
  };
}

export function FloatingFieldPortal({
  anchorRef,
  active,
  children,
  className = "",
}: FloatingFieldPortalProps) {
  const rect = useFixedAnchorRect(anchorRef, active);
  const style = useMemo(
    () => (rect ? floatingFieldStyleFromRect(rect) : null),
    [rect],
  );

  if (!active || !style) {
    return null;
  }

  return createPortal(
    <div
      className={`floating-canvas-field${className ? ` ${className}` : ""}`}
      style={style}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}
