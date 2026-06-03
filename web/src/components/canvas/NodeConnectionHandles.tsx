import type { CSSProperties } from "react";
import { Handle, Position } from "@xyflow/react";

const hiddenHandleStyle: CSSProperties = {
  opacity: 0,
  width: 8,
  height: 8,
  minWidth: 0,
  minHeight: 0,
  border: "none",
  background: "transparent",
  pointerEvents: "none",
};

/** Invisible handles so React Flow can route edges (required in v12). */
export function NodeConnectionHandles() {
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        id="t-top"
        style={hiddenHandleStyle}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="s-bottom"
        style={hiddenHandleStyle}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="t-left"
        style={hiddenHandleStyle}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="s-right"
        style={hiddenHandleStyle}
      />
    </>
  );
}
