import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

type GraphCanvasCaptureContextValue = {
  canvasRef: RefObject<HTMLDivElement | null>;
};

const GraphCanvasCaptureContext =
  createContext<GraphCanvasCaptureContextValue | null>(null);

export function GraphCanvasCaptureProvider({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const value = useMemo(() => ({ canvasRef }), []);
  return (
    <GraphCanvasCaptureContext.Provider value={value}>
      {children}
    </GraphCanvasCaptureContext.Provider>
  );
}

export function useGraphCanvasCaptureRef(): RefObject<HTMLDivElement | null> {
  const ctx = useContext(GraphCanvasCaptureContext);
  if (!ctx) {
    throw new Error("useGraphCanvasCaptureRef requires GraphCanvasCaptureProvider");
  }
  return ctx.canvasRef;
}
