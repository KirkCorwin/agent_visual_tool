import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import type { CustomPaletteType } from "../../graph/types";
import {
  getBuiltinPaletteOrder,
  parseBuiltinSortableId,
  type BuiltinPaletteNodeType,
} from "../../lib/builtinPaletteOrder";
import {
  getPalettePageIndex,
  isPageAtCapFromGraph,
  PALETTE_PAGE_IDS,
  type PalettePageId,
} from "../../lib/paletteLayout";
import { useGraphStore } from "../../store/graphStore";
import { usePaletteUi } from "../../store/paletteUiStore";
import { NODE_TYPE_LABELS, resolveCustomDisplayColor, resolveNodeTypeColors } from "../canvas/nodeStyles";
import { CustomPaletteColumn } from "./CustomPaletteColumn";
import { PaletteNodeButton } from "./PaletteNodeButton";
import { ResizablePaletteShell } from "./ResizablePaletteShell";

export function PaletteDock() {
  const {
    graph,
    moveCustomPaletteType,
    reorderCustomPaletteType,
    reorderBuiltinPalette,
  } = useGraphStore();
  const { isColumnOpen, setColumnOpen } = usePaletteUi();
  const pages = graph.customPalettePages ?? [];
  const typeById = new Map((graph.customNodeTypes ?? []).map((t) => [t.id, t]));
  const builtinOrder = getBuiltinPaletteOrder(graph.settings?.builtinPaletteOrder);
  const colors = resolveNodeTypeColors(graph.settings);
  const [activeType, setActiveType] = useState<CustomPaletteType | null>(null);
  const [activeBuiltin, setActiveBuiltin] =
    useState<BuiltinPaletteNodeType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const findPageForType = (typeId: string): PalettePageId | null => {
    for (const page of pages) {
      if (page.customTypeIds.includes(typeId)) {
        return page.id as PalettePageId;
      }
    }
    return null;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveType(null);
    setActiveBuiltin(null);
    if (!over) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeBuiltinType = parseBuiltinSortableId(activeId);
    if (activeBuiltinType) {
      const overBuiltinType = parseBuiltinSortableId(overId);
      if (!overBuiltinType) {
        return;
      }
      const fromIndex = builtinOrder.indexOf(activeBuiltinType);
      const toIndex = builtinOrder.indexOf(overBuiltinType);
      if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
        reorderBuiltinPalette(fromIndex, toIndex);
      }
      return;
    }

    const typeId = activeId;
    if (!typeById.has(typeId)) {
      return;
    }

    const fromPageId = findPageForType(typeId);
    if (!fromPageId) {
      return;
    }
    const fromPage = pages.find((p) => p.id === fromPageId);
    if (!fromPage) {
      return;
    }
    const fromIndex = fromPage.customTypeIds.indexOf(typeId);
    if (fromIndex < 0) {
      return;
    }

    if (typeById.has(overId)) {
      const toPageId = findPageForType(overId);
      if (!toPageId) {
        return;
      }
      const toPage = pages.find((p) => p.id === toPageId);
      if (!toPage) {
        return;
      }
      const toIndex = toPage.customTypeIds.indexOf(overId);
      if (toIndex < 0) {
        return;
      }
      if (fromPageId === toPageId) {
        if (fromIndex !== toIndex) {
          reorderCustomPaletteType(fromPageId, fromIndex, toIndex);
        }
      } else {
        if (isPageAtCapFromGraph(graph, toPageId)) {
          return;
        }
        moveCustomPaletteType(typeId, toPageId, toIndex);
      }
      return;
    }

    if (overId.startsWith("launcher-")) {
      const toPageId = overId.replace("launcher-", "") as PalettePageId;
      if (fromPageId === toPageId) {
        return;
      }
      if (isPageAtCapFromGraph(graph, toPageId)) {
        return;
      }
      const toPage = pages.find((p) => p.id === toPageId);
      if (!toPage) {
        return;
      }
      moveCustomPaletteType(typeId, toPageId, toPage.customTypeIds.length);
      return;
    }

    if (overId.startsWith("page-")) {
      const toPageId = overId.replace("page-", "") as PalettePageId;
      if (fromPageId === toPageId) {
        return;
      }
      if (isPageAtCapFromGraph(graph, toPageId)) {
        return;
      }
      const toPage = pages.find((p) => p.id === toPageId);
      if (!toPage) {
        return;
      }
      moveCustomPaletteType(typeId, toPageId, toPage.customTypeIds.length);
    }
  };

  const openColumns = PALETTE_PAGE_IDS.filter(
    (id, index) => index === 0 || isColumnOpen(id),
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(event) => {
        const id = String(event.active.id);
        const builtin = parseBuiltinSortableId(id);
        if (builtin) {
          setActiveBuiltin(builtin);
          return;
        }
        const entry = typeById.get(id);
        if (entry) {
          setActiveType(entry);
        }
      }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveType(null);
        setActiveBuiltin(null);
      }}
    >
      <div className="palette-dock">
        {openColumns.map((pageId) => {
          const page = pages.find((p) => p.id === pageId);
          if (!page) {
            return null;
          }
          const pageIndex = getPalettePageIndex(pageId);
          const columnIndex = pageIndex + 1;
          const showBuiltins = pageId === "palette-1";
          const showSettings = pageId === "palette-1";
          return (
            <ResizablePaletteShell key={pageId} columnIndex={columnIndex}>
              <CustomPaletteColumn
                page={page}
                pageIndex={pageIndex}
                showBuiltins={showBuiltins}
                showSettings={showSettings}
                onClose={
                  pageId !== "palette-1"
                    ? () => setColumnOpen(pageId, false)
                    : undefined
                }
              />
            </ResizablePaletteShell>
          );
        })}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeBuiltin ? (
          <div className="palette__builtin-row palette__builtin-row--overlay">
            <PaletteNodeButton
              label={NODE_TYPE_LABELS[activeBuiltin]}
              color={colors[activeBuiltin]}
              onAdd={() => {}}
              dragPayload={{ kind: "builtin", nodeType: activeBuiltin }}
              canvasDrag={false}
            />
          </div>
        ) : activeType ? (
          <div className="palette__custom-row palette__custom-row--overlay">
            <PaletteNodeButton
              label={activeType.label}
              color={resolveCustomDisplayColor(graph, activeType.id)}
              onAdd={() => {}}
              dragPayload={{ kind: "custom", customTypeId: activeType.id }}
              canvasDrag={false}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
