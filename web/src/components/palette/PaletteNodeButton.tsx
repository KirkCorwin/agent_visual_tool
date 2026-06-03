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
}: {
  label: string;
  color: string;
  onAdd: () => void;
  dragPayload: PaletteDragPayload;
  sortableHandleProps?: HTMLAttributes<HTMLSpanElement>;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="palette__btn"
      style={{ borderColor: color }}
      draggable
      onDragStart={(event) => {
        setPaletteDragData(event.dataTransfer, dragPayload);
        event.currentTarget.classList.add("palette__btn--dragging");
      }}
      onDragEnd={(event) => {
        endPaletteDrag();
        event.currentTarget.classList.remove("palette__btn--dragging");
      }}
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
          className="palette__drag-handle"
          aria-label="Reorder"
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
