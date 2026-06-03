export type Selection =
  | { kind: "nodes"; ids: string[] }
  | { kind: "edge"; id: string }
  | null;

export function getSelectedNodeIds(selection: Selection | null): string[] {
  if (selection?.kind === "nodes") {
    return selection.ids;
  }
  return [];
}

export function isNodeSelected(
  selection: Selection | null,
  nodeId: string,
): boolean {
  return selection?.kind === "nodes" && selection.ids.includes(nodeId);
}

export function selectionNodesCount(selection: Selection | null): number {
  return getSelectedNodeIds(selection).length;
}
