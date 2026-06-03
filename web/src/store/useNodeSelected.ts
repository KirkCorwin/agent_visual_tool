import { useGraphStore } from "./graphStore";

/** Subscribe to canvas node selection for a single node id. */
export function useIsNodeSelected(nodeId: string): boolean {
  const { selection } = useGraphStore();
  return selection?.kind === "node" && selection.id === nodeId;
}

export function useSelectedNodeId(): string | null {
  const { selection } = useGraphStore();
  return selection?.kind === "node" ? selection.id : null;
}
