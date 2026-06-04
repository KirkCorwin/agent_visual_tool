import {
  useLayoutEffect,
  useState,
  type RefObject,
} from "react";
import { useStore } from "@xyflow/react";

/** Screen-space rect for a fixed-position overlay anchored to an element. */
export function measureAnchorScreenRect(
  el: HTMLElement | null,
): DOMRect | null {
  if (!el) {
    return null;
  }
  return el.getBoundingClientRect();
}

/**
 * Keeps a screen anchor rect in sync while the React Flow viewport pans/zooms,
 * the window scrolls/resizes, or the anchor element resizes.
 */
export function useFixedAnchorRect(
  anchorRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): DOMRect | null {
  const transform = useStore((state) => state.transform);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!enabled || !anchorRef.current) {
      setRect(null);
      return;
    }

    const update = () => {
      setRect(measureAnchorScreenRect(anchorRef.current));
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
  }, [enabled, anchorRef, transform]);

  return enabled ? rect : null;
}
