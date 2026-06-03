import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import type { CustomPaletteType } from "../../graph/types";
import { isAtGlobalCustomCap } from "../../lib/paletteLayout";
import {
  getPalettePageIndex,
  PALETTE_PAGE_IDS,
  type PalettePageId,
} from "../../lib/paletteLayout";
import { useGraphStore } from "../../store/graphStore";
import { usePaletteUi } from "../../store/paletteUiStore";
import { resolveCustomDisplayColor } from "../canvas/nodeStyles";
import { CustomPaletteColumn } from "./CustomPaletteColumn";
import { PaletteNodeButton } from "./PaletteNodeButton";
import { ResizablePaletteShell } from "./ResizablePaletteShell";

export function PaletteDock() {
  const { graph, moveCustomPaletteType, reorderCustomPaletteType } =
    useGraphStore();
  const { isColumnOpen, setColumnOpen } = usePaletteUi();
  const pages = graph.customPalettePages ?? [];
  const typeById = new Map((graph.customNodeTypes ?? []).map((t) => [t.id, t]));
  const [activeType, setActiveType] = useState<CustomPaletteType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
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
    if (!over) {
      return;
    }
    const typeId = String(active.id);
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

    const overId = String(over.id);
    if (overId.startsWith("launcher-")) {
      const toPageId = overId.replace("launcher-", "") as PalettePageId;
      if (isAtGlobalCustomCap(graph) && toPageId !== fromPageId) {
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
      const toPage = pages.find((p) => p.id === toPageId);
      if (!toPage) {
        return;
      }
      if (toPageId === fromPageId) {
        return;
      }
      moveCustomPaletteType(typeId, toPageId, toPage.customTypeIds.length);
      return;
    }

    const overTypeId = overId;
    const toPageId = findPageForType(overTypeId);
    if (!toPageId) {
      return;
    }
    const toPage = pages.find((p) => p.id === toPageId);
    if (!toPage) {
      return;
    }
    const toIndex = toPage.customTypeIds.indexOf(overTypeId);
    if (toIndex < 0) {
      return;
    }
    if (fromPageId === toPageId) {
      reorderCustomPaletteType(fromPageId, fromIndex, toIndex);
    } else {
      moveCustomPaletteType(typeId, toPageId, toIndex);
    }
  };

  const openColumns = PALETTE_PAGE_IDS.filter(
    (id, index) => index === 0 || isColumnOpen(id),
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event) => {
        const entry = typeById.get(String(event.active.id));
        if (entry) {
          setActiveType(entry);
        }
      }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveType(null)}
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
      <DragOverlay>
        {activeType ? (
          <div className="palette__custom-row palette__custom-row--overlay">
            <PaletteNodeButton
              label={activeType.label}
              color={resolveCustomDisplayColor(graph, activeType.id)}
              onAdd={() => {}}
              dragPayload={{ kind: "custom", customTypeId: activeType.id }}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
