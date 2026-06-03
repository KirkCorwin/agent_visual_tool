import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PalettePageId } from "../lib/paletteLayout";
import { PALETTE_PAGE_IDS } from "../lib/paletteLayout";

type PaletteUiState = {
  openPageIds: Set<PalettePageId>;
  setColumnOpen: (pageId: PalettePageId, open: boolean) => void;
  toggleColumn: (pageId: PalettePageId) => void;
  isColumnOpen: (pageId: PalettePageId) => boolean;
  openPageIdSet: Set<string>;
};

const PaletteUiContext = createContext<PaletteUiState | null>(null);

export function PaletteUiProvider({ children }: { children: ReactNode }) {
  const [openPageIds, setOpenPageIds] = useState<Set<PalettePageId>>(
    () => new Set(),
  );

  const setColumnOpen = useCallback((pageId: PalettePageId, open: boolean) => {
    if (pageId === "palette-1") {
      return;
    }
    setOpenPageIds((prev) => {
      const next = new Set(prev);
      if (open) {
        next.add(pageId);
      } else {
        next.delete(pageId);
      }
      return next;
    });
  }, []);

  const toggleColumn = useCallback((pageId: PalettePageId) => {
    setOpenPageIds((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  }, []);

  const isColumnOpen = useCallback(
    (pageId: PalettePageId) => pageId === "palette-1" || openPageIds.has(pageId),
    [openPageIds],
  );

  const value = useMemo(
    (): PaletteUiState => ({
      openPageIds,
      setColumnOpen,
      toggleColumn,
      isColumnOpen,
      openPageIdSet: openPageIds as Set<string>,
    }),
    [openPageIds, setColumnOpen, toggleColumn, isColumnOpen],
  );

  return (
    <PaletteUiContext.Provider value={value}>{children}</PaletteUiContext.Provider>
  );
}

export function usePaletteUi(): PaletteUiState {
  const ctx = useContext(PaletteUiContext);
  if (!ctx) {
    throw new Error("usePaletteUi must be used within PaletteUiProvider");
  }
  return ctx;
}

export { PALETTE_PAGE_IDS };
