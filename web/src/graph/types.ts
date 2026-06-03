export const SCHEMA_VERSION = 1 as const;

export const NODE_TYPES = [
  "project",
  "requirement",
  "feature",
  "component",
  "task",
  "agent",
  "decision",
  "constraint",
  "folder",
  "custom",
] as const;

export type NodeType = (typeof NODE_TYPES)[number];

export const EDGE_TYPES = [
  "depends_on",
  "implements",
  "assigned_to",
  "references",
] as const;

export type EdgeType = (typeof EDGE_TYPES)[number];

export type GraphPosition = {
  x: number;
  y: number;
};

export type NodeData = {
  title: string;
  description?: string;
  status?: "draft" | "active" | "done" | "blocked";
  priority?: "low" | "medium" | "high";
  /** Agent nodes: role or persona label */
  role?: string;
  /** Folder nodes: canvas size */
  width?: number;
  height?: number;
  /** Palette entry id when type is custom */
  customTypeId?: string;
};

export type CustomPaletteType = {
  id: string;
  label: string;
  color: string;
};

/** 0 = standard palette; 1–3 = accessible palette slots (unlabeled in UI). */
export type AccessibleColorMode = 0 | 1 | 2 | 3;

export type GraphEditorSettings = {
  deleteChildrenOnNodeDelete: boolean;
  accessibleColorMode: AccessibleColorMode;
  /** When true, edge paths attach to the label box and move when the description is dragged. */
  edgeFollowsLabel: boolean;
};

export type PlanningNode = {
  id: string;
  type: NodeType;
  position: GraphPosition;
  /** Immediate stack parent; descendants move with this node. */
  parentId?: string;
  /** Nearest folder ancestor — derived for export paths. */
  folderId?: string;
  data: NodeData;
};

export type EdgeLabelDrag = {
  dx: number;
  dy: number;
};

export type EdgeData = {
  /** Custom relation text when isCustom is true */
  label?: string;
  /** When true, label holds a free-form relation; type stays for export defaults */
  isCustom?: boolean;
  /** Stack nesting — not drawn on canvas; included in export */
  implicit?: boolean;
  /** Offset from auto label position; also bends the edge through the label */
  labelDrag?: EdgeLabelDrag;
};

export type EdgeDataPatch = {
  edgeType?: EdgeType;
  label?: string;
  isCustom?: boolean;
  labelDrag?: EdgeLabelDrag;
};

export type PlanningEdge = {
  id: string;
  type: EdgeType;
  source: string;
  target: string;
  data?: EdgeData;
};

export type GraphMeta = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type PlanningGraph = {
  schemaVersion: typeof SCHEMA_VERSION;
  meta: GraphMeta;
  nodes: PlanningNode[];
  edges: PlanningEdge[];
  settings?: GraphEditorSettings;
  customNodeTypes?: CustomPaletteType[];
};

export type ParseSuccess = {
  ok: true;
  graph: PlanningGraph;
  warnings: string[];
};

export type ParseFailure = {
  ok: false;
  errors: string[];
};

export type ParseResult = ParseSuccess | ParseFailure;
