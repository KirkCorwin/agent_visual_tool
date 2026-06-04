import { useCallback, useEffect, useRef, useState } from "react";

import { useReactFlow } from "@xyflow/react";

import type { EdgeType } from "../../graph/types";
import {
  findPresetForEdge,
  getEdgeRelationMenuValue,
} from "../../lib/customEdgePresets";
import {
  formatEdgeType,
  getEdgeCanvasSummary,
  getEdgeMinimalLetter,
  isCustomEdge,
  normalizeCustomEdgeLabel,
} from "../../lib/edgeDisplay";
import {
  DropdownMenuPortal,
  isEventInsideCanvasDropdown,
} from "../shared/DropdownMenuPortal";
import { EdgeRelationMenuItems } from "../shared/EdgeRelationOptions";
import { useGraphStore } from "../../store/graphStore";

type EdgeLabelEditorProps = {
  edgeId: string;
  isSelected: boolean;
  style: React.CSSProperties;
};

type DragSession = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startDx: number;
  startDy: number;
};

export function EdgeLabelEditor({
  edgeId,
  isSelected,
  style,
}: EdgeLabelEditorProps) {
  const { graph, editorConfig, dispatch, selectEdge, selectNode } =
    useGraphStore();
  const presets = editorConfig.customEdgePresets;

  const { screenToFlowPosition } = useReactFlow();

  const edge = graph.edges.find((e) => e.id === edgeId);

  const rootRef = useRef<HTMLDivElement>(null);
  const typeBtnRef = useRef<HTMLButtonElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<DragSession | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [customTextEditing, setCustomTextEditing] = useState(false);
  const [customDraft, setCustomDraft] = useState("");
  const [dragging, setDragging] = useState(false);

  const selectThisEdge = useCallback(() => {
    selectNode(null);
    selectEdge(edgeId);
  }, [edgeId, selectEdge, selectNode]);

  const patchEdge = useCallback(
    (patch: {
      edgeType?: EdgeType;
      label?: string;
      isCustom?: boolean;
      labelDrag?: { dx: number; dy: number };
    }) => {
      dispatch({ type: "update_edge", id: edgeId, patch });
    },
    [dispatch, edgeId],
  );

  const beginCustomTextEdit = useCallback(() => {
    if (!edge) {
      return;
    }
    setCustomDraft(edge.data?.label ?? "");
    setCustomTextEditing(true);
    setMenuOpen(false);
    selectThisEdge();
  }, [edge, selectThisEdge]);

  const commitCustomText = useCallback(() => {
    const label = normalizeCustomEdgeLabel(customDraft);
    patchEdge({ isCustom: true, label: label || undefined });
    setCustomTextEditing(false);
  }, [customDraft, patchEdge]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (
        isEventInsideCanvasDropdown(event.target as Node, rootRef.current)
      ) {
        return;
      }
      setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [menuOpen]);

  useEffect(() => {
    if (!customTextEditing) {
      return;
    }
    const input = customInputRef.current;
    input?.focus();
    input?.select();
  }, [customTextEditing]);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
  }, []);

  useEffect(() => {
    if (!dragging) {
      return;
    }
    const onMove = (event: PointerEvent) => {
      const session = dragRef.current;
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }
      const startFlow = screenToFlowPosition({
        x: session.startClientX,
        y: session.startClientY,
      });
      const currentFlow = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      patchEdge({
        labelDrag: {
          dx: session.startDx + (currentFlow.x - startFlow.x),
          dy: session.startDy + (currentFlow.y - startFlow.y),
        },
      });
    };
    const onUp = (event: PointerEvent) => {
      if (dragRef.current?.pointerId === event.pointerId) {
        endDrag();
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, screenToFlowPosition, patchEdge, endDrag]);

  if (!edge) {
    return null;
  }

  const custom = isCustomEdge(edge);
  const matchedPreset = findPresetForEdge(edge, presets);
  const menuValue = getEdgeRelationMenuValue(edge, presets);

  const minimalLabels = graph.settings?.minimalEdgeLabels === true;

  const labelDrag = edge.data?.labelDrag;

  const typeButtonLabel = minimalLabels
    ? getEdgeMinimalLetter(edge)
    : matchedPreset
      ? matchedPreset.label
      : custom
        ? edge.data?.label?.trim() || "Custom"
        : formatEdgeType(edge.type);

  const onDragHandlePointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    selectThisEdge();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startDx: labelDrag?.dx ?? 0,
      startDy: labelDrag?.dy ?? 0,
    };
    setDragging(true);
  };

  const onDragHandlePointerUp = (event: React.PointerEvent) => {
    event.stopPropagation();
    if (dragRef.current?.pointerId === event.pointerId) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }
      endDrag();
    }
  };

  const stopCanvas = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const onRootPointerDownCapture = (event: React.PointerEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest(".edge-label__drag-handle")) {
      return;
    }
    event.stopPropagation();
  };

  const rootClassName = [
    "edge-label",
    "nodrag",
    "nopan",
    isSelected ? "edge-label--selected" : "",
    menuOpen ? "edge-label--menu-open" : "",
    customTextEditing ? "edge-label--text-editing" : "",
    minimalLabels ? "edge-label--minimal" : "",
    dragging ? "edge-label--dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={rootRef}
      className={rootClassName}
      style={style}
      onPointerDownCapture={onRootPointerDownCapture}
      onClick={stopCanvas}
    >
      <div className="edge-label__toolbar">
        <button
          type="button"
          className="edge-label__drag-handle"
          title="Drag to move label along the connection"
          aria-label="Drag edge label"
          onPointerDown={onDragHandlePointerDown}
          onPointerUp={onDragHandlePointerUp}
          onPointerCancel={onDragHandlePointerUp}
        >
          ⠿
        </button>

        {customTextEditing ? (
          <input
            ref={customInputRef}
            type="text"
            className="edge-label__custom-input"
            value={customDraft}
            placeholder="Relation label"
            onChange={(event) => setCustomDraft(event.target.value)}
            onBlur={commitCustomText}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Enter") {
                event.preventDefault();
                commitCustomText();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setCustomTextEditing(false);
              }
            }}
            onPointerDown={stopCanvas}
            onClick={stopCanvas}
          />
        ) : (
          <button
            ref={typeBtnRef}
            type="button"
            className="edge-label__type-btn"
            title={minimalLabels ? getEdgeCanvasSummary(edge) : undefined}
            aria-expanded={menuOpen}
            aria-haspopup="listbox"
            onPointerDown={stopCanvas}
            onClick={(event) => {
              event.stopPropagation();
              selectThisEdge();
              setCustomTextEditing(false);
              setMenuOpen((open) => !open);
            }}
          >
            <span className="edge-label__type-text">{typeButtonLabel}</span>
            <span className="edge-label__caret" aria-hidden>
              ▾
            </span>
          </button>
        )}

        {custom && !customTextEditing ? (
          <button
            type="button"
            className="edge-label__text-edit-btn"
            title="Edit custom label"
            aria-label="Edit custom label"
            onPointerDown={stopCanvas}
            onClick={(event) => {
              event.stopPropagation();
              beginCustomTextEdit();
            }}
          >
            T
          </button>
        ) : null}

        {labelDrag && Math.hypot(labelDrag.dx, labelDrag.dy) >= 4 ? (
          <button
            type="button"
            className="edge-label__reset-pos"
            title="Reset label position"
            onPointerDown={stopCanvas}
            onClick={(event) => {
              event.stopPropagation();
              patchEdge({ labelDrag: { dx: 0, dy: 0 } });
            }}
          >
            ↺
          </button>
        ) : null}
      </div>

      <DropdownMenuPortal
        open={menuOpen}
        anchorRef={typeBtnRef}
        menuClassName="edge-label__menu"
        portalClassName="edge-label__menu--portal"
        minWidth={160}
      >
        <EdgeRelationMenuItems
          presets={presets}
          activeValue={menuValue}
          onPickBuiltin={(edgeType) => {
            setCustomTextEditing(false);
            patchEdge({ edgeType, isCustom: false, label: undefined });
            setMenuOpen(false);
          }}
          onPickPreset={(preset) => {
            setCustomTextEditing(false);
            patchEdge({ isCustom: true, label: preset.label });
            setMenuOpen(false);
          }}
          onPickCustom={() => {
            patchEdge({ isCustom: true });
            setMenuOpen(false);
            beginCustomTextEdit();
          }}
        />
      </DropdownMenuPortal>
    </div>
  );
}
