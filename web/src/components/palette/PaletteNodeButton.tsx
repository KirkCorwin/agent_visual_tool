import type { HTMLAttributes } from "react";
import {
  endPaletteDrag,
  setPaletteDragData,
  type PaletteDragPayload,
} from "../../lib/paletteDrag";

export function PaletteNodeButton({
  label,
  color,
  onAdd,
  dragPayload,
  sortableHandleProps,
  canvasDrag = true,
}: {
  label: string;
  color: string;
  onAdd: () => void;
  dragPayload: PaletteDragPayload;
  /** Reorder handle (dnd-kit) only — does not change chip cursor. */
  sortableHandleProps?: HTMLAttributes<HTMLSpanElement>;
  canvasDrag?: boolean;
}) {
  const draggableButton = canvasDrag;

  const onCanvasDragStart = (event: React.DragEvent) => {
    setPaletteDragData(event.dataTransfer, dragPayload);
    const el = event.currentTarget as HTMLElement;
    el.classList.add("palette__btn--dragging");
  };

  const onCanvasDragEnd = (event: React.DragEvent) => {
    endPaletteDrag();
    (event.currentTarget as HTMLElement).classList.remove("palette__btn--dragging");
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="palette__btn"
      style={{ borderColor: color }}
      draggable={draggableButton}
      onDragStart={
        draggableButton
          ? (event) => {
              onCanvasDragStart(event);
            }
          : undefined
      }
      onDragEnd={
        draggableButton
          ? (event) => {
              onCanvasDragEnd(event);
            }
          : undefined
      }
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onAdd();
        }
      }}
      onClick={onAdd}
      title={label}
    >
      {sortableHandleProps ? (
        <span
          className="palette__drag-handle palette__drag-handle--reorder"
          aria-label="Reorder in palette"
          {...sortableHandleProps}
          onClick={(e) => e.stopPropagation()}
        >
          ⋮⋮
        </span>
      ) : null}
      <span className="palette__dot" style={{ background: color }} />
      <span className="palette__btn-label">{label}</span>
    </div>
  );
}
