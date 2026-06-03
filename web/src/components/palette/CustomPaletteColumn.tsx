import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useEffect, useRef, useState } from "react";
import { PALETTE_BUILTIN_TYPES } from "../../lib/planningNodeTypes";
import type { CustomPalettePage, NodeType } from "../../graph/types";
import { firstOpenPageForAdd, isAtGlobalCustomCap } from "../../lib/paletteLayout";
import { useGraphStore } from "../../store/graphStore";
import { usePaletteUi } from "../../store/paletteUiStore";
import { NODE_TYPE_LABELS, resolveNodeTypeColors } from "../canvas/nodeStyles";
import { PaletteLauncherBar } from "./PaletteLauncherBar";
import { PaletteNodeButton } from "./PaletteNodeButton";
import { PaletteSettingsFooter } from "./PaletteSettingsFooter";
import { SortableCustomRow } from "./SortableCustomRow";

const BUILTIN_PALETTE_TYPES = [...PALETTE_BUILTIN_TYPES, "folder"] as const;

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
  const { openPageIdSet } = usePaletteUi();
  const [renamingPage, setRenamingPage] = useState(false);
  const [pageNameDraft, setPageNameDraft] = useState(page.name);
  const pageNameRef = useRef<HTMLInputElement>(null);
  const colors = resolveNodeTypeColors(graph.settings);
  const pages = graph.customPalettePages ?? [];
  const typeById = new Map((graph.customNodeTypes ?? []).map((t) => [t.id, t]));
  const pageTypes = page.customTypeIds
    .map((id) => typeById.get(id))
    .filter((t): t is NonNullable<typeof t> => t != null);
  const atCap = isAtGlobalCustomCap(graph);

  const { setNodeRef, isOver } = useDroppable({
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

  const commitPageRename = () => {
    renamePalettePage(page.id, pageNameDraft);
    setRenamingPage(false);
  };

  const handleAddCustom = () => {
    const target = firstOpenPageForAdd(openPageIdSet, pages, atCap);
    addCustomPaletteType(target);
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
        ref={setNodeRef}
        className={`palette__nodes${isOver ? " palette__nodes--drop-target" : ""}`}
      >
        {showBuiltins ? (
          <div className="palette__grid">
            {BUILTIN_PALETTE_TYPES.map((nodeType) => (
              <PaletteNodeButton
                key={nodeType}
                label={NODE_TYPE_LABELS[nodeType]}
                color={colors[nodeType]}
                onAdd={() => addNode(nodeType as NodeType)}
                dragPayload={{ kind: "builtin", nodeType: nodeType as NodeType }}
              />
            ))}
          </div>
        ) : null}
        <SortableContext
          items={page.customTypeIds}
          strategy={verticalListSortingStrategy}
        >
          <div className={showBuiltins ? "palette__custom-list" : "palette__grid"}>
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
        {atCap ? (
          <span className="palette__max-label">max custom nodes</span>
        ) : (
          <button
            type="button"
            className="palette__add-type"
            title="Add custom node type"
            aria-label="Add custom node type"
            onClick={handleAddCustom}
          >
            +
          </button>
        )}
      </div>
      <PaletteLauncherBar graph={graph} pageIndex={pageIndex} pages={pages} />
      {showSettings ? <PaletteSettingsFooter /> : null}
    </aside>
  );
}
