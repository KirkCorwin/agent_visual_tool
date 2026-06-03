import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PLANNING_NODE_TYPES } from "../../lib/planningNodeTypes";
import type { NodeType } from "../../graph/types";
import { useGraphStore } from "../../store/graphStore";
import {
  NODE_TYPE_LABELS,
  resolveNodeTypeColors,
} from "../canvas/nodeStyles";

type NodeTypeMenuProps = {
  nodeId: string;
  currentType: Exclude<NodeType, "folder">;
  typeLabel?: string;
  borderColor?: string;
  className?: string;
};

export function NodeTypeMenu({
  nodeId,
  currentType,
  typeLabel,
  borderColor,
  className = "",
}: NodeTypeMenuProps) {
  const { setNodeType, selectNode, selectEdge, graph } = useGraphStore();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    minWidth: number;
  } | null>(null);
  const colors = resolveNodeTypeColors(graph.settings);
  const color = borderColor ?? colors[currentType];
  const label = typeLabel ?? NODE_TYPE_LABELS[currentType];

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setMenuStyle(null);
      return;
    }
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuStyle({
      top: rect.bottom + 4,
      left: rect.left,
      minWidth: Math.max(rect.width, 144),
    });
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) {
        return;
      }
      if (
        target instanceof Element &&
        target.closest(".node-type-menu__list--portal")
      ) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  const menuList = open && menuStyle ? (
    <ul
      className="node-type-menu__list node-type-menu__list--portal"
      role="listbox"
      style={{
        position: "fixed",
        top: menuStyle.top,
        left: menuStyle.left,
        minWidth: menuStyle.minWidth,
        zIndex: 3000,
      }}
    >
      {PLANNING_NODE_TYPES.filter((t) => t !== "custom").map((nodeType) => (
        <li key={nodeType}>
          <button
            type="button"
            role="option"
            className={`node-type-menu__item${nodeType === currentType ? " node-type-menu__item--active" : ""}`}
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
    </ul>
  ) : null;

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
      {menuList ? createPortal(menuList, document.body) : null}
    </div>
  );
}
