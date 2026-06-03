import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useRef, useState } from "react";
import type { CustomPaletteType, PlanningGraph } from "../../graph/types";
import type { PaletteDragPayload } from "../../lib/paletteDrag";
import { resolveCustomDisplayColor } from "../canvas/nodeStyles";
import { PaletteNodeButton } from "./PaletteNodeButton";

export function SortableCustomRow({
  entry,
  graph,
  onAdd,
  onRename,
  onRemove,
}: {
  entry: CustomPaletteType;
  graph: PlanningGraph;
  onAdd: () => void;
  onRename: (label: string) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id, data: { kind: "custom-type", typeId: entry.id } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      setDraft(entry.label);
    }
  }, [entry.label, editing]);

  useEffect(() => {
    if (!editing) {
      return;
    }
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const commitRename = () => {
    const next = draft.trim() || "Custom";
    onRename(next);
    setDraft(next);
    setEditing(false);
  };

  const cancelRename = () => {
    setDraft(entry.label);
    setEditing(false);
  };

  const dragPayload: PaletteDragPayload = {
    kind: "custom",
    customTypeId: entry.id,
  };

  const displayColor = resolveCustomDisplayColor(graph, entry.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`palette__custom-row${editing ? " palette__custom-row--editing" : ""}${isDragging ? " palette__custom-row--dragging" : ""}`}
    >
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          className="palette__custom-label-input"
          value={draft}
          aria-label="Custom node type name"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitRename();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              cancelRename();
            }
          }}
          onBlur={commitRename}
          onClick={(event) => event.stopPropagation()}
        />
      ) : (
        <PaletteNodeButton
          label={entry.label}
          color={displayColor}
          onAdd={onAdd}
          dragPayload={dragPayload}
          sortableHandleProps={{ ...attributes, ...listeners }}
        />
      )}
      <button
        type="button"
        className={`palette__custom-action palette__custom-rename${editing ? " palette__custom-action--active" : ""}`}
        title={editing ? "Editing name" : `Rename ${entry.label}`}
        aria-label={editing ? "Editing name" : `Rename ${entry.label}`}
        aria-pressed={editing}
        onClick={(event) => {
          event.stopPropagation();
          if (editing) {
            commitRename();
          } else {
            setDraft(entry.label);
            setEditing(true);
          }
        }}
      >
        T
      </button>
      <button
        type="button"
        className="palette__custom-action palette__custom-delete"
        title={`Remove ${entry.label} from palette`}
        aria-label={`Remove ${entry.label} from palette`}
        disabled={editing}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M3 6h18M8 6V4h8v2m-1 14H9a1 1 0 0 1-1-1V7h12v12a1 1 0 0 1-1 1z" />
        </svg>
      </button>
    </div>
  );
}
