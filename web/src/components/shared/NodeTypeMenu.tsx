import { useEffect, useRef, useState } from "react";
import { PLANNING_NODE_TYPES } from "../../lib/planningNodeTypes";
import type { NodeType } from "../../graph/types";
import { useGraphStore } from "../../store/graphStore";
import {
  NODE_TYPE_LABELS,
  resolveCustomDisplayColor,
  resolveNodeTypeColors,
} from "../canvas/nodeStyles";
import {
  DropdownMenuPortal,
  isEventInsideCanvasDropdown,
} from "./DropdownMenuPortal";

type NodeTypeMenuProps = {
  nodeId: string;
  currentType: Exclude<NodeType, "folder">;
  currentCustomTypeId?: string;
  typeLabel?: string;
  borderColor?: string;
  className?: string;
};

export function NodeTypeMenu({
  nodeId,
  currentType,
  currentCustomTypeId,
  typeLabel,
  borderColor,
  className = "",
}: NodeTypeMenuProps) {
  const { setNodeType, selectNode, selectEdge, graph } = useGraphStore();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const colors = resolveNodeTypeColors(graph.settings);
  const customTypes = graph.customNodeTypes ?? [];
  const color = borderColor ?? colors[currentType];
  const label = typeLabel ?? NODE_TYPE_LABELS[currentType];

  const isActiveBuiltin = (nodeType: Exclude<NodeType, "folder" | "custom">) =>
    currentType === nodeType;

  const isActiveCustom = (customTypeId: string) =>
    currentType === "custom" && currentCustomTypeId === customTypeId;

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (
        isEventInsideCanvasDropdown(event.target as Node, rootRef.current)
      ) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`node-type-menu ${className}`.trim()}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        ref={buttonRef}
        type="button"
        className="node-type-menu__btn"
        style={{ background: color }}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={(event) => {
          event.stopPropagation();
          selectNode(nodeId);
          selectEdge(null);
          setOpen((value) => !value);
        }}
      >
        <span>{label}</span>
        <span className="node-type-menu__caret" aria-hidden>
          ▾
        </span>
      </button>
      <DropdownMenuPortal
        open={open}
        anchorRef={buttonRef}
        menuClassName="node-type-menu__list"
        portalClassName="node-type-menu__list--portal"
      >
        {PLANNING_NODE_TYPES.filter((t) => t !== "custom").map((nodeType) => (
          <li key={nodeType}>
            <button
              type="button"
              role="option"
              className={`node-type-menu__item${isActiveBuiltin(nodeType) ? " node-type-menu__item--active" : ""}`}
              onClick={() => {
                setNodeType(nodeId, nodeType);
                setOpen(false);
              }}
            >
              <span
                className="node-type-menu__swatch"
                style={{ background: colors[nodeType] }}
              />
              {NODE_TYPE_LABELS[nodeType]}
            </button>
          </li>
        ))}
        {customTypes.length > 0 ? (
          <li className="node-type-menu__divider" role="separator" />
        ) : null}
        {customTypes.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              role="option"
              className={`node-type-menu__item${isActiveCustom(entry.id) ? " node-type-menu__item--active" : ""}`}
              onClick={() => {
                setNodeType(nodeId, "custom", entry.id);
                setOpen(false);
              }}
            >
              <span
                className="node-type-menu__swatch"
                style={{
                  background: resolveCustomDisplayColor(graph, entry.id),
                }}
              />
              {entry.label}
            </button>
          </li>
        ))}
      </DropdownMenuPortal>
    </div>
  );
}
