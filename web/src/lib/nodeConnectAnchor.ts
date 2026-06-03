import type { Node } from "@xyflow/react";
import {
  FOLDER_NODE_TYPE,
  type FolderFlowData,
} from "../graph/reactFlowAdapter";
import {
  DEFAULT_FOLDER_HEIGHT,
  DEFAULT_FOLDER_WIDTH,
  NODE_CARD_CENTER_OFFSET,
} from "../graph/folderBounds";

export type FlowPoint = { x: number; y: number };

export function getFlowNodeCenter(node: Node): FlowPoint {
  if (node.type === FOLDER_NODE_TYPE) {
    const data = node.data as FolderFlowData;
    const width = data.width ?? DEFAULT_FOLDER_WIDTH;
    const height = data.height ?? DEFAULT_FOLDER_HEIGHT;
    return {
      x: node.position.x + width / 2,
      y: node.position.y + height / 2,
    };
  }

  const width = node.measured?.width ?? node.width;
  const height = node.measured?.height ?? node.height;
  if (typeof width === "number" && typeof height === "number") {
    return {
      x: node.position.x + width / 2,
      y: node.position.y + height / 2,
    };
  }

  return {
    x: node.position.x + NODE_CARD_CENTER_OFFSET.x,
    y: node.position.y + NODE_CARD_CENTER_OFFSET.y,
  };
}
