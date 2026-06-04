import { useMemo, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

import {
  CANVAS_DROPDOWN_ATTR,
  CANVAS_DROPDOWN_Z_INDEX,
} from "../../lib/overlayZIndex";
import { useFixedAnchorRect } from "../../lib/useFixedAnchorRect";

export type DropdownMenuPosition = {
  top: number;
  left: number;
  minWidth: number;
};

export function dropdownMenuPositionFromRect(
  rect: Pick<DOMRect, "top" | "left" | "bottom" | "width">,
  gap: number,
  minWidthDefault: number,
): DropdownMenuPosition {
  return {
    top: rect.bottom + gap,
    left: rect.left,
    minWidth: Math.max(rect.width, minWidthDefault),
  };
}

export function useDropdownMenuPosition(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  options?: { gap?: number; minWidth?: number },
): DropdownMenuPosition | null {
  const gap = options?.gap ?? 4;
  const minWidthDefault = options?.minWidth ?? 144;
  const rect = useFixedAnchorRect(anchorRef, open);

  return useMemo(() => {
    if (!rect) {
      return null;
    }
    return dropdownMenuPositionFromRect(rect, gap, minWidthDefault);
  }, [rect, gap, minWidthDefault]);
}

export function isEventInsideCanvasDropdown(
  target: Node,
  anchorRoot: HTMLElement | null,
): boolean {
  if (anchorRoot?.contains(target)) {
    return true;
  }
  if (
    target instanceof Element &&
    target.closest(`[${CANVAS_DROPDOWN_ATTR}]`)
  ) {
    return true;
  }
  return false;
}

type DropdownMenuPortalProps = {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  menuClassName: string;
  portalClassName?: string;
  role?: string;
  children: ReactNode;
  gap?: number;
  minWidth?: number;
};

export function DropdownMenuPortal({
  open,
  anchorRef,
  menuClassName,
  portalClassName = "",
  role = "listbox",
  children,
  gap,
  minWidth,
}: DropdownMenuPortalProps) {
  const position = useDropdownMenuPosition(open, anchorRef, { gap, minWidth });
  if (!open || !position) {
    return null;
  }

  return createPortal(
    <ul
      {...{ [CANVAS_DROPDOWN_ATTR]: "" }}
      className={`${menuClassName}${portalClassName ? ` ${portalClassName}` : ""}`}
      role={role}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        minWidth: position.minWidth,
        zIndex: CANVAS_DROPDOWN_Z_INDEX,
        pointerEvents: "auto",
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {children}
    </ul>,
    document.body,
  );
}
