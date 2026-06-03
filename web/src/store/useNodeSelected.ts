import { isNodeSelected } from "./selection";
import { useGraphStore } from "./graphStore";

/** Subscribe to canvas node selection for a single node id. */
export function useIsNodeSelected(nodeId: string): boolean {
  const { selection } = useGraphStore();
  return isNodeSelected(selection, nodeId);
}

export function useSelectedNodeId(): string | null {
  const { selectedNodeIds } = useGraphStore();
  return selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;
}
