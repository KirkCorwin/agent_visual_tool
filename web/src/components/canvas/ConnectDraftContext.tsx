import { createContext, useContext, type ReactNode } from "react";

import type { FlowPoint } from "../../lib/nodeConnectAnchor";

export type ConnectDraft = {
  connectKeyHeld: boolean;
  sourceId: string | null;
  hoverId: string | null;
  draftPointer: FlowPoint | null;
  setSourceId: (id: string | null) => void;
  setHoverId: (id: string | null) => void;
  setDraftPointer: (point: FlowPoint | null) => void;
  startConnect: (
    id: string,
    anchor: FlowPoint,
    event: React.PointerEvent,
  ) => void;
  releaseConnect: (targetId: string | null, event: PointerEvent) => void;
  cancelConnect: () => void;
};

const ConnectDraftContext = createContext<ConnectDraft | null>(null);

export function ConnectDraftProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: ConnectDraft;
}) {
  return (
    <ConnectDraftContext.Provider value={value}>
      {children}
    </ConnectDraftContext.Provider>
  );
}

export function useConnectDraft(): ConnectDraft {
  const ctx = useContext(ConnectDraftContext);
  if (!ctx) {
    throw new Error("useConnectDraft requires ConnectDraftProvider");
  }
  return ctx;
}
