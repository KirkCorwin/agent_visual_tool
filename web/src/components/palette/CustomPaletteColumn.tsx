import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useEffect, useRef, useState } from "react";
import {
  builtinSortableId,
  getBuiltinPaletteOrder,
} from "../../lib/builtinPaletteOrder";
import type { CustomPalettePage, NodeType } from "../../graph/types";
import type { PalettePageId } from "../../lib/paletteLayout";
import {
  isAtGlobalCustomCap,
  isPageAtCap,
} from "../../lib/paletteLayout";
import { useGraphStore } from "../../store/graphStore";
import { NODE_TYPE_LABELS, resolveNodeTypeColors } from "../canvas/nodeStyles";
import { PaletteLauncherBar } from "./PaletteLauncherBar";
import { PaletteSettingsFooter } from "./PaletteSettingsFooter";
import { SortableBuiltinRow } from "./SortableBuiltinRow";
import { SortableCustomRow } from "./SortableCustomRow";

export function CustomPaletteColumn({
  page,
  pageIndex,
  showBuiltins,
  showSettings,
  onClose,
}: {
  page: CustomPalettePage;
  pageIndex: number;
  showBuiltins: boolean;
  showSettings: boolean;
  onClose?: () => void;
}) {
  const {
    graph,
    addNode,
    addCustomPaletteType,
    removeCustomPaletteType,
    updateCustomPaletteType,
    renamePalettePage,
  } = useGraphStore();
  const [renamingPage, setRenamingPage] = useState(false);
  const [pageNameDraft, setPageNameDraft] = useState(page.name);
  const pageNameRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCustomCountRef = useRef(page.customTypeIds.length);
  const colors = resolveNodeTypeColors(graph.settings);
  const builtinOrder = getBuiltinPaletteOrder(
    graph.settings?.builtinPaletteOrder,
  );
  const builtinSortableIds = builtinOrder.map(builtinSortableId);
  const pages = graph.customPalettePages ?? [];
  const typeById = new Map((graph.customNodeTypes ?? []).map((t) => [t.id, t]));
  const pageTypes = page.customTypeIds
    .map((id) => typeById.get(id))
    .filter((t): t is NonNullable<typeof t> => t != null);
  const pageId = page.id as PalettePageId;
  const atGlobalCap = isAtGlobalCustomCap(graph);
  const atPageCap = isPageAtCap(pageId, page.customTypeIds.length);
  const atCap = atGlobalCap || atPageCap;

  const { setNodeRef: setPageDropRef, isOver: isPageOver } = useDroppable({
    id: `page-${page.id}`,
    data: { kind: "page", pageId: page.id },
  });

  useEffect(() => {
    if (!renamingPage) {
      setPageNameDraft(page.name);
    }
  }, [page.name, renamingPage]);

  useEffect(() => {
    if (renamingPage) {
      pageNameRef.current?.focus();
      pageNameRef.current?.select();
    }
  }, [renamingPage]);

  useEffect(() => {
    const prev = prevCustomCountRef.current;
    const next = page.customTypeIds.length;
    if (next > prev && scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
    }
    prevCustomCountRef.current = next;
  }, [page.customTypeIds.length]);

  const commitPageRename = () => {
    renamePalettePage(page.id, pageNameDraft);
    setRenamingPage(false);
  };

  const handleAddCustom = () => {
    addCustomPaletteType(pageId);
  };

  return (
    <aside className="palette">
      <header className="palette__column-header">
        {renamingPage ? (
          <input
            ref={pageNameRef}
            type="text"
            className="palette__page-name-input"
            value={pageNameDraft}
            aria-label="Palette name"
            onChange={(e) => setPageNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitPageRename();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setPageNameDraft(page.name);
                setRenamingPage(false);
              }
            }}
            onBlur={commitPageRename}
          />
        ) : (
          <h2 className="sidebar__title palette__page-title">{page.name}</h2>
        )}
        <div className="palette__column-header-actions">
          <button
            type="button"
            className="palette__custom-action palette__page-rename"
            title="Rename palette"
            aria-label="Rename palette"
            onClick={() => {
              setPageNameDraft(page.name);
              setRenamingPage(true);
            }}
          >
            T
          </button>
          {onClose ? (
            <button
              type="button"
              className="palette__column-close"
              aria-label={`Close ${page.name}`}
              onClick={onClose}
            >
              ×
            </button>
          ) : null}
        </div>
      </header>
      {showBuiltins ? (
        <p className="palette__hint">Drag onto the canvas or click to add.</p>
      ) : null}

      <div
        ref={scrollRef}
        className={`palette__scroll${isPageOver ? " palette__scroll--drop-target" : ""}`}
      >
        <div ref={setPageDropRef} className="palette__scroll-inner">
          {showBuiltins ? (
            <SortableContext
              items={builtinSortableIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="palette__grid palette__grid--builtins">
                {builtinOrder.map((nodeType) => (
                  <SortableBuiltinRow
                    key={nodeType}
                    nodeType={nodeType}
                    label={NODE_TYPE_LABELS[nodeType]}
                    color={colors[nodeType]}
                    onAdd={() => addNode(nodeType as NodeType)}
                  />
                ))}
              </div>
            </SortableContext>
          ) : null}
          <SortableContext
            items={page.customTypeIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="palette__custom-list">
              {pageTypes.map((entry) => (
                <SortableCustomRow
                  key={entry.id}
                  entry={entry}
                  graph={graph}
                  onAdd={() =>
                    addNode("custom", undefined, { customTypeId: entry.id })
                  }
                  onRename={(label) => updateCustomPaletteType(entry.id, label)}
                  onRemove={() => removeCustomPaletteType(entry.id)}
                />
              ))}
            </div>
          </SortableContext>
        </div>
      </div>

      <footer className="palette__footer">
        {atCap ? (
          <span className="palette__max-label">Max Nodes</span>
        ) : (
          <button
            type="button"
            className="palette__add-type"
            title="Add custom node type to this palette"
            aria-label="Add custom node type to this palette"
            onClick={handleAddCustom}
          >
            +
          </button>
        )}
        <PaletteLauncherBar graph={graph} pageIndex={pageIndex} pages={pages} />
        {showSettings ? <PaletteSettingsFooter /> : null}
      </footer>
    </aside>
  );
}
