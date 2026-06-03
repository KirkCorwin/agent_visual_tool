import type { Edge, Node } from "@xyflow/react";

import { getEdgeCanvasSummary } from "../lib/edgeDisplay";

import {

  computeEdgeBundleLayouts,

  type EdgeBundleLayout,

} from "../lib/edgeBundleLayout";

import {

  PLANNING_EDGE_MARKER_END,

  PLANNING_EDGE_MARKER_END_SELECTED,

} from "./edgeMarkers";

import { isImplicitEdge } from "./implicitEdges";

import { assignParentsFromPositions } from "./nodeHierarchy";
import { computeStackZIndexes } from "./nodeZIndex";

import type { EdgeType, PlanningEdge, PlanningGraph, PlanningNode } from "./types";

import {

  getFolderSize,

  getPlanningNodeSize,

  PLANNING_NODE_HEIGHT,

  PLANNING_NODE_WIDTH,

} from "./folderBounds";



export type PlanningNodeFlowData = {

  planningType: Exclude<PlanningNode["type"], "folder">;

  title: string;

  description?: string;

  status?: PlanningNode["data"]["status"];

  priority?: PlanningNode["data"]["priority"];

  role?: string;

  parentId?: string;

  folderId?: string;

  width?: number;

  height?: number;

  customTypeId?: string;

  connectHover?: boolean;

  connectSource?: boolean;

  isCanvasSelected?: boolean;

};



export type FolderFlowData = {

  title: string;

  description?: string;

  width: number;

  height: number;

  parentId?: string;

  connectHover?: boolean;

  connectSource?: boolean;

  isCanvasSelected?: boolean;

};



export type PlanningEdgeFlowData = {

  edgeType: EdgeType;

  label?: string;

  isCustom?: boolean;

  labelDrag?: { dx: number; dy: number };

  curvature?: number;

  labelOffsetPx?: number;

  bundleIndex?: number;

};



export const PLANNING_NODE_TYPE = "planning" as const;

export const FOLDER_NODE_TYPE = "folder" as const;

export const PLANNING_EDGE_TYPE = "planning" as const;



export { PLANNING_NODE_HEIGHT, PLANNING_NODE_WIDTH } from "./folderBounds";



export function toFlowNode(
  node: PlanningNode,
  zIndex: number,
): Node<PlanningNodeFlowData> {

  const { width, height } = getPlanningNodeSize(node);

  return {

    id: node.id,

    type: PLANNING_NODE_TYPE,

    position: { ...node.position },

    zIndex,

    width,

    height,

    style: { width, height },

    data: {

      planningType: node.type as PlanningNodeFlowData["planningType"],

      title: node.data.title,

      description: node.data.description,

      status: node.data.status,

      priority: node.data.priority,

      role: node.data.role,

      parentId: node.parentId,

      folderId: node.folderId,

      width,

      height,

      customTypeId: node.data.customTypeId,

    },

  };

}



export function toFolderFlowNode(
  node: PlanningNode,
  zIndex: number,
): Node<FolderFlowData> {

  const { width, height } = getFolderSize(node);

  return {

    id: node.id,

    type: FOLDER_NODE_TYPE,

    position: { ...node.position },

    zIndex,

    width,

    height,

    style: { width, height },

    data: {

      title: node.data.title,

      description: node.data.description,

      width,

      height,

      parentId: node.parentId,

    },

  };

}



export function toFlowNodes(graph: PlanningGraph): Node[] {

  const zById = computeStackZIndexes(graph.nodes);

  const folders = graph.nodes.filter((n) => n.type === "folder");

  const rest = graph.nodes.filter((n) => n.type !== "folder");

  return [

    ...folders.map((n) => toFolderFlowNode(n, zById.get(n.id) ?? 0)),

    ...rest.map((n) => toFlowNode(n, zById.get(n.id) ?? 50)),

  ];

}



export function toFlowEdge(

  edge: PlanningEdge,

  options?: { selected?: boolean; bundle?: EdgeBundleLayout },

): Edge<PlanningEdgeFlowData> {

  const selected = options?.selected === true;

  const bundle = options?.bundle;

  return {

    id: edge.id,

    type: PLANNING_EDGE_TYPE,

    source: edge.source,

    target: edge.target,

    label: getEdgeCanvasSummary(edge),

    selectable: true,

    focusable: true,

    interactionWidth: 28,

    markerEnd: selected

      ? PLANNING_EDGE_MARKER_END_SELECTED

      : PLANNING_EDGE_MARKER_END,

    style: {

      stroke: selected ? "#b8bcc6" : "#9aa0a6",

      strokeWidth: selected ? 2.5 : 2,

    },

    data: {

      edgeType: edge.type,

      label: edge.data?.label,

      isCustom: edge.data?.isCustom,

      labelDrag: edge.data?.labelDrag,

      curvature: bundle?.curvature,

      labelOffsetPx: bundle?.labelOffsetPx,

      bundleIndex: bundle?.bundleIndex,

    },

  };

}



export function toFlowEdges(

  edges: PlanningEdge[],

  selectedEdgeId?: string | null,

): Edge<PlanningEdgeFlowData>[] {

  const visible = edges.filter((edge) => !isImplicitEdge(edge));

  const layouts = computeEdgeBundleLayouts(visible);

  return visible.map((edge) =>

    toFlowEdge(edge, {

      selected: edge.id === selectedEdgeId,

      bundle: layouts.get(edge.id),

    }),

  );

}



/** Reconcile graph nodes into React Flow state without dropping measured sizes. */

export function mergeFlowNodesFromGraph(

  current: Node[],

  graph: PlanningGraph,

): Node[] {

  const next = toFlowNodes(graph);

  const currentById = new Map(current.map((node) => [node.id, node]));

  return next.map((node) => {

    const existing = currentById.get(node.id);

    if (!existing) {

      return node;

    }

    const width = node.width ?? existing.width;

    const height = node.height ?? existing.height;

    const zIndex = existing.dragging
      ? Math.max(existing.zIndex ?? 0, node.zIndex ?? 0)
      : node.zIndex;

    return {

      ...node,

      measured: existing.measured ?? node.measured,

      position: existing.dragging ? existing.position : node.position,

      zIndex,

      width,

      height,

      style: {

        ...node.style,

        width,

        height,

      },

      data: {

        ...existing.data,

        ...node.data,

        ...(typeof width === "number" ? { width } : {}),

        ...(typeof height === "number" ? { height } : {}),

      },

    };

  });

}



export function flowNodeToPlanning(node: Node<PlanningNodeFlowData>): PlanningNode {

  return {

    id: node.id,

    type: node.data.planningType,

    position: { x: node.position.x, y: node.position.y },

    parentId: node.data.parentId,

    folderId: node.data.folderId,

    data: {

      title: node.data.title,

      description: node.data.description,

      status: node.data.status,

      priority: node.data.priority,

      role: node.data.role,

      width: node.data.width ?? node.width,

      height: node.data.height ?? node.height,

      customTypeId: node.data.customTypeId,

    },

  };

}



export function flowFolderToPlanning(

  node: Node<FolderFlowData>,

): PlanningNode {

  return {

    id: node.id,

    type: "folder",

    position: { x: node.position.x, y: node.position.y },

    parentId: node.data.parentId,

    data: {

      title: node.data.title,

      description: node.data.description,

      width: node.data.width ?? node.width,

      height: node.data.height ?? node.height,

    },

  };

}



function syncNodesFromFlow(

  graph: PlanningGraph,

  flowNodes: Node[],

): PlanningNode[] {

  const folderById = new Map(

    flowNodes

      .filter((n) => n.type === FOLDER_NODE_TYPE)

      .map((n) => [

        n.id,

        flowFolderToPlanning(n as Node<FolderFlowData>),

      ]),

  );



  return graph.nodes.map((node) => {

    if (node.type === "folder") {

      return folderById.get(node.id) ?? node;

    }

    const flow = flowNodes.find((n) => n.id === node.id) as

      | Node<PlanningNodeFlowData>

      | undefined;

    if (!flow) {

      return node;

    }

    return flowNodeToPlanning(flow);

  });

}



export function applyCanvasState(

  graph: PlanningGraph,

  flowNodes: Node[],

  options?: { reassignParentIds?: Set<string> },

): PlanningGraph {

  const synced = syncNodesFromFlow(graph, flowNodes);

  const flowZ = new Map(
    flowNodes.map((n) => [n.id, n.zIndex ?? 0] as const),
  );

  const withParents = assignParentsFromPositions(

    {

      ...graph,

      nodes: synced,

    },

    flowZ,

    options?.reassignParentIds,

  );

  return { ...graph, nodes: withParents };

}



/** @deprecated use applyCanvasState */

export function applyNodePositions(

  graph: PlanningGraph,

  nodes: Node<PlanningNodeFlowData>[],

): PlanningGraph {

  return applyCanvasState(graph, nodes);

}


