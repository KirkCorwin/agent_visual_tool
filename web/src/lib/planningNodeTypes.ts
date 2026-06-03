import { NODE_TYPES, type NodeType } from "../graph/types";

/** Built-in palette / card types (excludes folder and user-defined custom palette entries). */
export const PALETTE_BUILTIN_TYPES = NODE_TYPES.filter(
  (t): t is Exclude<NodeType, "folder" | "custom"> =>
    t !== "folder" && t !== "custom",
);

/** Planning card types (excludes folder — folders use a separate canvas node). */
export const PLANNING_NODE_TYPES = NODE_TYPES.filter(
  (t): t is Exclude<NodeType, "folder"> => t !== "folder",
);

export type PlanningCardType = (typeof PLANNING_NODE_TYPES)[number];
