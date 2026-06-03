import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

/** Above nested child nodes and canvas chrome; matches type menu overlay. */
export const FLOATING_FIELD_Z_INDEX = 3000;

type FloatingFieldPortalProps = {
  anchorRef: RefObject<HTMLElement | null>;
  active: boolean;
  children: ReactNode;
  className?: string;
};

export function FloatingFieldPortal({
  anchorRef,
  active,
  children,
  className = "",
}: FloatingFieldPortalProps) {
  const [style, setStyle] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (!active || !anchorRef.current) {
      setStyle(null);
      return;
    }

    const update = () => {
      const el = anchorRef.current;
      if (!el) {
        return;
      }
      const rect = el.getBoundingClientRect();
      setStyle({
        position: "fixed",
        top: rect.top,
        left: rect.left,
        width: Math.max(rect.width, 48),
        maxWidth: `min(${Math.max(rect.width, 48)}px, calc(100vw - ${rect.left}px - 8px))`,
        zIndex: FLOATING_FIELD_Z_INDEX,
        pointerEvents: "auto",
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(anchorRef.current);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [active, anchorRef]);

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
