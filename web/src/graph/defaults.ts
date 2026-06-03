import type {
  EdgeType,
  GraphEditorSettings,
  GraphPosition,
  NodeData,
  NodeType,
  PlanningEdge,
  PlanningGraph,
  PlanningNode,
} from "./types";
import { DEFAULT_FOLDER_HEIGHT, DEFAULT_FOLDER_WIDTH } from "./folderBounds";
import { DEFAULT_GRAPH_SETTINGS, normalizeGraphSettings } from "./nodeColors";
import { SCHEMA_VERSION } from "./types";

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createEmptyGraph(name = "Untitled project"): PlanningGraph {
  const timestamp = nowIso();
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: {
      id: newId(),
      name,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    nodes: [],
    edges: [],
    settings: { ...DEFAULT_GRAPH_SETTINGS },
    customNodeTypes: [],
  };
}

export function normalizeGraph(graph: PlanningGraph): PlanningGraph {
  const rawSettings = graph.settings as
    | (GraphEditorSettings & { accessibleColors?: boolean })
    | undefined;
  return {
    ...graph,
    settings: normalizeGraphSettings({
      ...DEFAULT_GRAPH_SETTINGS,
      ...rawSettings,
    }),
    customNodeTypes: graph.customNodeTypes ?? [],
  };
}

const DEFAULT_POSITIONS: Partial<Record<NodeType, GraphPosition>> = {
  project: { x: 0, y: 0 },
  requirement: { x: -200, y: 120 },
  feature: { x: 0, y: 120 },
  component: { x: 200, y: 120 },
  task: { x: -100, y: 260 },
  agent: { x: 100, y: 260 },
  decision: { x: -200, y: 380 },
  constraint: { x: 200, y: 380 },
  folder: { x: 240, y: 480 },
  custom: { x: 160, y: 320 },
};

const DEFAULT_TITLES: Record<NodeType, string> = {
  project: "New project",
  requirement: "New requirement",
  feature: "New feature",
  component: "New component",
  task: "New task",
  agent: "New agent",
  decision: "New decision",
  constraint: "New constraint",
  folder: "New folder",
  custom: "Custom",
};

export function createNode(
  type: NodeType,
  options?: {
    id?: string;
    position?: GraphPosition;
    parentId?: string;
    folderId?: string;
    data?: Partial<NodeData>;
  },
): PlanningNode {
  const data: PlanningNode["data"] = {
    title: options?.data?.title ?? DEFAULT_TITLES[type],
    ...options?.data,
  };
  if (type === "folder") {
    data.width = data.width ?? DEFAULT_FOLDER_WIDTH;
    data.height = data.height ?? DEFAULT_FOLDER_HEIGHT;
  }
  if (type === "custom" && !data.customTypeId) {
    data.customTypeId = options?.data?.customTypeId;
  }
  return {
    id: options?.id ?? newId(),
    type,
    position: options?.position ?? DEFAULT_POSITIONS[type] ?? { x: 0, y: 0 },
    parentId: options?.parentId,
    folderId: options?.folderId,
    data,
  };
}

export function createEdge(
  type: EdgeType,
  source: string,
  target: string,
  options?: { id?: string; label?: string },
): PlanningEdge {
  return {
    id: options?.id ?? newId(),
    type,
    source,
    target,
    data: options?.label ? { label: options.label } : undefined,
  };
}

export function touchGraph(graph: PlanningGraph): PlanningGraph {
  return normalizeGraph({
    ...graph,
    meta: { ...graph.meta, updatedAt: nowIso() },
  });
}

export function createInitialEditorGraph(): PlanningGraph {
  const graph = createEmptyGraph("Agent Visual Tool");
  graph.nodes.push(
    createNode("project", {
      position: { x: 80, y: 80 },
      data: {
        title: "Agent Visual Tool",
        description: "Visual project architecture designer",
      },
    }),
  );
  return graph;
}
