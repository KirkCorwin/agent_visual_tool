import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { NodeType } from "../../graph/types";
import type { PaletteDragPayload } from "../../lib/paletteDrag";
import { builtinSortableId } from "../../lib/builtinPaletteOrder";
import type { BuiltinPaletteNodeType } from "../../lib/builtinPaletteOrder";
import { PaletteNodeButton } from "./PaletteNodeButton";

export function SortableBuiltinRow({
  nodeType,
  label,
  color,
  onAdd,
}: {
  nodeType: BuiltinPaletteNodeType;
  label: string;
  color: string;
  onAdd: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: builtinSortableId(nodeType),
    data: { kind: "builtin-type", nodeType },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragPayload: PaletteDragPayload = {
    kind: "builtin",
    nodeType: nodeType as NodeType,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`palette__builtin-row${isDragging ? " palette__sortable-row--source" : ""}`}
    >
      <PaletteNodeButton
        label={label}
        color={color}
        onAdd={onAdd}
        dragPayload={dragPayload}
        sortableHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}
