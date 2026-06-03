import { useDroppable } from "@dnd-kit/core";
import type { CustomPalettePage } from "../../graph/types";
import { isAtGlobalCustomCap } from "../../lib/paletteLayout";
import type { PalettePageId } from "../../lib/paletteLayout";
import { getPageTypeCount } from "../../lib/paletteLayout";
import type { PlanningGraph } from "../../graph/types";
import { usePaletteUi } from "../../store/paletteUiStore";

export function PaletteLauncherBar({
  graph,
  pageIndex,
  pages,
}: {
  graph: PlanningGraph;
  pageIndex: number;
  pages: CustomPalettePage[];
}) {
  const { toggleColumn, isColumnOpen } = usePaletteUi();
  const atCap = isAtGlobalCustomCap(graph);
  const targets: { id: PalettePageId; index: number }[] = [];
  for (let i = pageIndex + 1; i < pages.length; i++) {
    targets.push({ id: pages[i].id as PalettePageId, index: i });
  }
  if (targets.length === 0) {
    return null;
  }

  return (
    <div className="palette__launchers">
      {targets.map(({ id, index }) => (
        <LauncherButton
          key={id}
          page={pages[index]}
          pageId={id}
          count={getPageTypeCount(pages, id)}
          isOpen={isColumnOpen(id)}
          atCap={atCap}
          onToggle={() => toggleColumn(id)}
        />
      ))}
    </div>
  );
}

function LauncherButton({
  page,
  pageId,
  count,
  isOpen,
  atCap,
  onToggle,
}: {
  page: CustomPalettePage;
  pageId: PalettePageId;
  count: number;
  isOpen: boolean;
  atCap: boolean;
  onToggle: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `launcher-${pageId}`,
    data: { kind: "launcher", pageId },
  });
  const reject = isOver && atCap;
  const accept = isOver && !atCap;

  const countSuffix = count > 0 ? ` +${count}` : "";

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`palette__launcher${isOpen ? " palette__launcher--open" : ""}${accept ? " palette__launcher--accept" : ""}${reject ? " palette__launcher--reject" : ""}`}
      onClick={onToggle}
    >
      {page.name}
      {countSuffix}
    </button>
  );
}
