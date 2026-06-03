import { useReactFlow, useUpdateNodeInternals } from "@xyflow/react";
import { useCallback, useRef, useState } from "react";

type NodeCornerResizerProps = {
  nodeId: string;
  minWidth: number;
  minHeight: number;
  /** Live size while dragging — updates only this node (no graph churn). */
  onSizing: (width: number, height: number) => void;
  onSizeCommit: (width: number, height: number) => void;
};

function ResizeGripLines() {
  return (
    <svg
      className="node-resize-grip__lines"
      viewBox="0 0 12 12"
      width="12"
      height="12"
      aria-hidden
    >
      <line x1="12" y1="10" x2="10" y2="12" stroke="#e8eaed" strokeWidth="1.5" />
      <line x1="12" y1="6.5" x2="6.5" y2="12" stroke="#e8eaed" strokeWidth="1.5" />
      <line x1="12" y1="3" x2="3" y2="12" stroke="#e8eaed" strokeWidth="1.5" />
    </svg>
  );
}

export function NodeCornerResizer({
  nodeId,
  minWidth,
  minHeight,
  onSizing,
  onSizeCommit,
}: NodeCornerResizerProps) {
  const { getNode, screenToFlowPosition } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const [resizing, setResizing] = useState(false);
  const sessionRef = useRef<{ pointerId: number } | null>(null);
  const pendingSizeRef = useRef<{ width: number; height: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  const flushSizing = useCallback(() => {
    rafRef.current = null;
    const pending = pendingSizeRef.current;
    if (!pending) {
      return;
    }
    onSizing(pending.width, pending.height);
  }, [onSizing]);

  const scheduleSizing = useCallback(
    (nextWidth: number, nextHeight: number) => {
      pendingSizeRef.current = { width: nextWidth, height: nextHeight };
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(flushSizing);
      }
    },
    [flushSizing],
  );

  const endSession = useCallback(
    (clientX: number, clientY: number) => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingSizeRef.current = null;

      const session = sessionRef.current;
      sessionRef.current = null;
      setResizing(false);
      if (!session) {
        return;
      }
      const flow = screenToFlowPosition({ x: clientX, y: clientY });
      const node = getNode(nodeId);
      if (!node) {
        return;
      }
      const width = Math.max(minWidth, Math.round(flow.x - node.position.x));
      const height = Math.max(minHeight, Math.round(flow.y - node.position.y));
      onSizeCommit(width, height);
      requestAnimationFrame(() => updateNodeInternals(nodeId));
    },
    [
      getNode,
      minHeight,
      minWidth,
      nodeId,
      onSizeCommit,
      screenToFlowPosition,
      updateNodeInternals,
    ],
  );

  const onGripPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();

    const node = getNode(nodeId);
    if (!node) {
      return;
    }

    sessionRef.current = { pointerId: event.pointerId };
    setResizing(true);
    event.currentTarget.setPointerCapture(event.pointerId);

    const onMove = (ev: PointerEvent) => {
      if (sessionRef.current?.pointerId !== ev.pointerId) {
        return;
      }
      const flow = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      const node = getNode(nodeId);
      if (!node) {
        return;
      }
      const nextWidth = Math.max(minWidth, Math.round(flow.x - node.position.x));
      const nextHeight = Math.max(minHeight, Math.round(flow.y - node.position.y));
      scheduleSizing(nextWidth, nextHeight);
    };

    const onUp = (ev: PointerEvent) => {
      if (sessionRef.current?.pointerId !== ev.pointerId) {
        return;
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      endSession(ev.clientX, ev.clientY);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  return (
    <div
      role="separator"
      aria-label="Resize"
      className={`node-resize-grip nodrag nopan${resizing ? " node-resize-grip--resizing" : ""}`}
      onPointerDown={onGripPointerDown}
    >
      <ResizeGripLines />
    </div>
  );
}
