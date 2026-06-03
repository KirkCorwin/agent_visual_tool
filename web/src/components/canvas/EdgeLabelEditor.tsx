import { useCallback, useEffect, useRef, useState } from "react";

import { useReactFlow } from "@xyflow/react";

import { EDGE_TYPES, type EdgeType } from "../../graph/types";

import {

  CUSTOM_EDGE_OPTION,

  formatEdgeType,

  isCustomEdge,

} from "../../lib/edgeDisplay";

import { useGraphStore } from "../../store/graphStore";

import { InlineEditable } from "../shared/InlineEditable";



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

  const { graph, dispatch, selectEdge, selectNode } = useGraphStore();

  const { screenToFlowPosition } = useReactFlow();

  const edge = graph.edges.find((e) => e.id === edgeId);

  const rootRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef<DragSession | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);

  const [dragging, setDragging] = useState(false);



  useEffect(() => {

    if (!menuOpen) {

      return;

    }

    const onPointerDown = (event: PointerEvent) => {

      if (

        rootRef.current &&

        !rootRef.current.contains(event.target as Node)

      ) {

        setMenuOpen(false);

      }

    };

    window.addEventListener("pointerdown", onPointerDown, true);

    return () => window.removeEventListener("pointerdown", onPointerDown, true);

  }, [menuOpen]);



  const selectThisEdge = useCallback(() => {
    selectNode(null);
    selectEdge(edgeId);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [edgeId, selectEdge, selectNode]);

  const patchEdge = useCallback(

    (

      patch: {

        edgeType?: EdgeType;

        label?: string;

        isCustom?: boolean;

        labelDrag?: { dx: number; dy: number };

      },

    ) => {

      dispatch({ type: "update_edge", id: edgeId, patch });

    },

    [dispatch, edgeId],

  );



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

  const labelDrag = edge.data?.labelDrag;



  const pickType = (value: EdgeType | typeof CUSTOM_EDGE_OPTION) => {

    if (value === CUSTOM_EDGE_OPTION) {

      patchEdge({ isCustom: true });

    } else {

      patchEdge({ edgeType: value, isCustom: false });

    }

    setMenuOpen(false);

  };



  const onLabelPointerDown = (event: React.PointerEvent) => {
    event.stopPropagation();
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, button")) {
      return;
    }
    selectThisEdge();
  };

  const onLabelClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, button")) {
      return;
    }
    selectThisEdge();
  };

  const onDragHandleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    selectThisEdge();
  };

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

      endDrag();

    }

  };



  return (

    <div

      ref={rootRef}

      className={`edge-label${isSelected ? " edge-label--selected" : ""}${dragging ? " edge-label--dragging" : ""}`}

      style={style}

      onPointerDown={onLabelPointerDown}

      onClick={onLabelClick}

    >

      <div className="edge-label__toolbar">

        <button

          type="button"

          className="edge-label__drag-handle"

          title="Drag to move label along the connection"

          aria-label="Drag edge label"

          onClick={onDragHandleClick}

          onPointerDown={onDragHandlePointerDown}

          onPointerUp={onDragHandlePointerUp}

          onPointerCancel={onDragHandlePointerUp}

        >

          ⠿

        </button>

        <button

          type="button"

          className="edge-label__type-btn"

          onClick={(event) => {

            event.stopPropagation();

            selectThisEdge();

            setMenuOpen((open) => !open);

          }}

        >

          <span>{custom ? "custom" : formatEdgeType(edge.type)}</span>

          <span className="edge-label__caret" aria-hidden>

            ▾

          </span>

        </button>

        {labelDrag && Math.hypot(labelDrag.dx, labelDrag.dy) >= 4 ? (

          <button

            type="button"

            className="edge-label__reset-pos"

            title="Reset label position"

            onClick={() => patchEdge({ labelDrag: { dx: 0, dy: 0 } })}

          >

            ↺

          </button>

        ) : null}

      </div>



      {menuOpen ? (

        <ul className="edge-label__menu" role="listbox">

          {EDGE_TYPES.map((edgeType) => (

            <li key={edgeType}>

              <button

                type="button"

                role="option"

                className="edge-label__menu-item"

                onClick={() => pickType(edgeType)}

              >

                {formatEdgeType(edgeType)}

              </button>

            </li>

          ))}

          <li className="edge-label__menu-divider" aria-hidden />

          <li>

            <button

              type="button"

              role="option"

              className={`edge-label__menu-item${custom ? " edge-label__menu-item--active" : ""}`}

              onClick={() => pickType(CUSTOM_EDGE_OPTION)}

            >

              Custom

            </button>

          </li>

        </ul>

      ) : null}



      {custom ? (

        <div className="edge-label__custom-block">

          <span className="edge-label__custom-heading">custom</span>

          <InlineEditable

            className="edge-label__custom-value"

            placeholder="double-click to set relation"

            value={edge.data?.label ?? ""}

            onCommit={(text) => patchEdge({ label: text })}

          />

        </div>

      ) : null}

    </div>

  );

}

