import { useEffect, useState } from "react";
import { useReactFlow, useStore } from "@xyflow/react";
import { getFlowNodeCenter } from "../../lib/nodeConnectAnchor";
import { useConnectDraft } from "./ConnectDraftContext";

export function ConnectDraftLine() {
  const { sourceId, hoverId, draftPointer } = useConnectDraft();
  const { flowToScreenPosition, getNode } = useReactFlow();
  const transform = useStore((state) => state.transform);
  const [canvasEl, setCanvasEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.querySelector(".graph-canvas");
    setCanvasEl(el instanceof HTMLElement ? el : null);
  }, [sourceId, draftPointer, transform]);

  if (!sourceId || !draftPointer || !canvasEl) {
    return null;
  }

  const sourceNode = getNode(sourceId);
  if (!sourceNode) {
    return null;
  }

  const fromFlow = getFlowNodeCenter(sourceNode);
  let toFlow = draftPointer;
  if (hoverId && hoverId !== sourceId) {
    const targetNode = getNode(hoverId);
    if (targetNode) {
      toFlow = getFlowNodeCenter(targetNode);
    }
  }

  const from = flowToScreenPosition(fromFlow);
  const to = flowToScreenPosition(toFlow);
  const rect = canvasEl.getBoundingClientRect();
  const x1 = from.x - rect.left;
  const y1 = from.y - rect.top;
  const x2 = to.x - rect.left;
  const y2 = to.y - rect.top;
  const snapped = hoverId !== null && hoverId !== sourceId;

  return (
    <svg
      className={`connect-draft-line${snapped ? " connect-draft-line--snapped" : ""}`}
      aria-hidden
    >
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <circle cx={x2} cy={y2} r={snapped ? 5 : 3} className="connect-draft-line__tip" />
    </svg>
  );
}
