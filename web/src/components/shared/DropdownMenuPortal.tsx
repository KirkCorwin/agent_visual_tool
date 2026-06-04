import {
  useLayoutEffect,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import {
  CANVAS_DROPDOWN_ATTR,
  CANVAS_DROPDOWN_Z_INDEX,
} from "../../lib/overlayZIndex";

export type DropdownMenuPosition = {
  top: number;
  left: number;
  minWidth: number;
};

export function useDropdownMenuPosition(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  options?: { gap?: number; minWidth?: number },
): DropdownMenuPosition | null {
  const gap = options?.gap ?? 4;
  const minWidthDefault = options?.minWidth ?? 144;
  const [position, setPosition] = useState<DropdownMenuPosition | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setPosition(null);
      return;
    }
    const update = () => {
      const el = anchorRef.current;
      if (!el) {
        return;
      }
      const rect = el.getBoundingClientRect();
      setPosition({
        top: rect.bottom + gap,
        left: rect.left,
        minWidth: Math.max(rect.width, minWidthDefault),
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, anchorRef, gap, minWidthDefault]);

  return position;
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
