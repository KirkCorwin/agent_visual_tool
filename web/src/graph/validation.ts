import { DEFAULT_GRAPH_SETTINGS, normalizeGraphSettings } from "./nodeColors";
import {
  EDGE_TYPES,
  NODE_TYPES,
  SCHEMA_VERSION,
  type EdgeType,
  type NodeType,
  type ParseResult,
  type PlanningEdge,
  type PlanningGraph,
  type PlanningNode,
} from "./types";
import { normalizeGraph } from "./defaults";
import { MAX_CUSTOM_PALETTE_TYPES } from "../lib/customPaletteLimits";

const EDGE_TYPE_SET = new Set<string>(EDGE_TYPES);
const NODE_TYPE_SET = new Set<string>(NODE_TYPES);

/** Suggested source → target pairs; unusual combos yield warnings only. */
const RECOMMENDED_EDGE_PAIRS: Record<
  EdgeType,
  Array<{ source: NodeType | "*"; target: NodeType | "*" }>
> = {
  depends_on: [
    { source: "task", target: "task" },
    { source: "feature", target: "requirement" },
    { source: "component", target: "feature" },
    { source: "task", target: "feature" },
    { source: "*", target: "*" },
  ],
  implements: [
    { source: "component", target: "feature" },
    { source: "feature", target: "requirement" },
    { source: "task", target: "feature" },
    { source: "*", target: "*" },
  ],
  assigned_to: [
    { source: "task", target: "agent" },
    { source: "*", target: "agent" },
    { source: "*", target: "folder" },
  ],
  references: [{ source: "*", target: "*" }],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseNodeData(raw: unknown, path: string, errors: string[]): boolean {
  if (!isRecord(raw)) {
    errors.push(`${path}.data must be an object`);
    return false;
  }
  if (typeof raw.title !== "string" || raw.title.trim() === "") {
    errors.push(`${path}.data.title must be a non-empty string`);
    return false;
  }
  if (raw.description !== undefined && typeof raw.description !== "string") {
    errors.push(`${path}.data.description must be a string`);
    return false;
  }
  if (
    raw.status !== undefined &&
    !["draft", "active", "done", "blocked"].includes(raw.status as string)
  ) {
    errors.push(`${path}.data.status is invalid`);
    return false;
  }
  if (
    raw.priority !== undefined &&
    !["low", "medium", "high"].includes(raw.priority as string)
  ) {
    errors.push(`${path}.data.priority is invalid`);
    return false;
  }
  if (raw.role !== undefined && typeof raw.role !== "string") {
    errors.push(`${path}.data.role must be a string`);
    return false;
  }
  if (raw.width !== undefined && !isFiniteNumber(raw.width)) {
    errors.push(`${path}.data.width must be a number`);
    return false;
  }
  if (raw.height !== undefined && !isFiniteNumber(raw.height)) {
    errors.push(`${path}.data.height must be a number`);
    return false;
  }
  if (raw.customTypeId !== undefined && typeof raw.customTypeId !== "string") {
    errors.push(`${path}.data.customTypeId must be a string`);
    return false;
  }
  return true;
}

function parseNode(raw: unknown, index: number, errors: string[]): PlanningNode | null {
  const path = `nodes[${index}]`;
  if (!isRecord(raw)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (typeof raw.id !== "string" || raw.id.trim() === "") {
    errors.push(`${path}.id must be a non-empty string`);
    return null;
  }
  if (!NODE_TYPE_SET.has(raw.type as string)) {
    errors.push(`${path}.type is invalid`);
    return null;
  }
  if (!isRecord(raw.position)) {
    errors.push(`${path}.position must be an object`);
    return null;
  }
  if (
    !isFiniteNumber(raw.position.x) ||
    !isFiniteNumber(raw.position.y)
  ) {
    errors.push(`${path}.position.x and .y must be numbers`);
    return null;
  }
  if (!parseNodeData(raw.data, path, errors)) {
    return null;
  }

  const dataRaw = raw.data as Record<string, unknown>;
  const node: PlanningNode = {
    id: raw.id,
    type: raw.type as NodeType,
    position: { x: raw.position.x, y: raw.position.y },
    parentId:
      typeof raw.parentId === "string" && raw.parentId.trim()
        ? raw.parentId
        : typeof raw.folderId === "string" && raw.folderId.trim()
          ? raw.folderId
          : undefined,
    folderId:
      typeof raw.folderId === "string" && raw.folderId.trim()
        ? raw.folderId
        : undefined,
    data: {
      title: dataRaw.title as string,
      description: dataRaw.description as string | undefined,
      status: dataRaw.status as PlanningNode["data"]["status"] | undefined,
      priority: dataRaw.priority as PlanningNode["data"]["priority"] | undefined,
      role: dataRaw.role as string | undefined,
      width: dataRaw.width as number | undefined,
      height: dataRaw.height as number | undefined,
      customTypeId: dataRaw.customTypeId as string | undefined,
    },
  };
  if (node.type === "folder" && node.folderId && !node.parentId) {
    node.folderId = undefined;
  }
  return node;
}

function parseEdge(raw: unknown, index: number, errors: string[]): PlanningEdge | null {
  const path = `edges[${index}]`;
  if (!isRecord(raw)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (typeof raw.id !== "string" || raw.id.trim() === "") {
    errors.push(`${path}.id must be a non-empty string`);
    return null;
  }
  if (!EDGE_TYPE_SET.has(raw.type as string)) {
    errors.push(`${path}.type is invalid`);
    return null;
  }
  if (typeof raw.source !== "string" || raw.source.trim() === "") {
    errors.push(`${path}.source must be a non-empty string`);
    return null;
  }
  if (typeof raw.target !== "string" || raw.target.trim() === "") {
    errors.push(`${path}.target must be a non-empty string`);
    return null;
  }
  if (raw.data !== undefined) {
    if (!isRecord(raw.data)) {
      errors.push(`${path}.data must be an object`);
      return null;
    }
    const dataRaw = raw.data as Record<string, unknown>;
    if (dataRaw.label !== undefined && typeof dataRaw.label !== "string") {
      errors.push(`${path}.data.label must be a string`);
      return null;
    }
    if (dataRaw.isCustom !== undefined && typeof dataRaw.isCustom !== "boolean") {
      errors.push(`${path}.data.isCustom must be a boolean`);
      return null;
    }
    const dragRaw = dataRaw.labelDrag;
    if (dragRaw !== undefined) {
      if (!isRecord(dragRaw)) {
        errors.push(`${path}.data.labelDrag must be an object`);
        return null;
      }
      if (typeof dragRaw.dx !== "number" || typeof dragRaw.dy !== "number") {
        errors.push(`${path}.data.labelDrag.dx/dy must be numbers`);
        return null;
      }
    }
  }

  const dataRaw = raw.data as Record<string, unknown> | undefined;
  const dragParsed =
    dataRaw?.labelDrag && isRecord(dataRaw.labelDrag)
      ? {
          dx: (dataRaw.labelDrag as Record<string, unknown>).dx as number,
          dy: (dataRaw.labelDrag as Record<string, unknown>).dy as number,
        }
      : undefined;
  const data = dataRaw
    ? {
        label: dataRaw.label as string | undefined,
        isCustom: dataRaw.isCustom === true ? true : undefined,
        labelDrag:
          dragParsed && Math.hypot(dragParsed.dx, dragParsed.dy) >= 0.5
            ? dragParsed
            : undefined,
      }
    : undefined;
  const hasData =
    data &&
    (data.label !== undefined ||
      data.isCustom === true ||
      data.labelDrag !== undefined);

  return {
    id: raw.id,
    type: raw.type as EdgeType,
    source: raw.source,
    target: raw.target,
    data: hasData ? data : undefined,
  };
}

function isRecommendedEdge(
  edgeType: EdgeType,
  sourceType: NodeType,
  targetType: NodeType,
): boolean {
  const rules = RECOMMENDED_EDGE_PAIRS[edgeType];
  return rules.some(
    (rule) =>
      (rule.source === "*" || rule.source === sourceType) &&
      (rule.target === "*" || rule.target === targetType),
  );
}

function collectStructuralWarnings(graph: PlanningGraph): string[] {
  const warnings: string[] = [];
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  const projectCount = graph.nodes.filter((n) => n.type === "project").length;
  if (projectCount === 0) {
    warnings.push("Graph has no project node");
  } else if (projectCount > 1) {
    warnings.push(`Graph has ${projectCount} project nodes; one is recommended`);
  }

  for (const edge of graph.edges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) {
      continue;
    }
    if (edge.source === edge.target) {
      warnings.push(`Edge ${edge.id} connects a node to itself`);
    }
    if (!isRecommendedEdge(edge.type, source.type, target.type)) {
      warnings.push(
        `Edge ${edge.id}: ${edge.type} from ${source.type} to ${target.type} is unusual`,
      );
    }
  }

  return warnings;
}

export function validatePlanningGraph(graph: PlanningGraph): ParseResult {
  const errors: string[] = [];

  if (graph.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${SCHEMA_VERSION}`);
  }

  if (!graph.meta?.id?.trim()) {
    errors.push("meta.id must be a non-empty string");
  }
  if (!graph.meta?.name?.trim()) {
    errors.push("meta.name must be a non-empty string");
  }
  if (!graph.meta?.createdAt?.trim() || !graph.meta?.updatedAt?.trim()) {
    errors.push("meta.createdAt and meta.updatedAt are required");
  }

  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (!NODE_TYPE_SET.has(node.type)) {
      errors.push(`Node ${node.id} has invalid type`);
    }
    if (!node.data.title?.trim()) {
      errors.push(`Node ${node.id} must have a non-empty title`);
    }
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node id: ${node.id}`);
    }
    nodeIds.add(node.id);
  }

  for (const node of graph.nodes) {
    if (node.parentId && !nodeIds.has(node.parentId)) {
      errors.push(
        `Node ${node.id} references missing parent "${node.parentId}"`,
      );
    }
    if (node.folderId && !nodeIds.has(node.folderId)) {
      errors.push(
        `Node ${node.id} references missing folder "${node.folderId}"`,
      );
    }
  }

  for (const node of graph.nodes) {
    if (!node.parentId) {
      continue;
    }
    let current: string | undefined = node.parentId;
    const visited = new Set<string>([node.id]);
    while (current) {
      if (visited.has(current)) {
        errors.push(`Node ${node.id} has a cyclic parent chain`);
        break;
      }
      visited.add(current);
      const parent = graph.nodes.find((n) => n.id === current);
      current = parent?.parentId;
    }
  }

  const edgeIds = new Set<string>();
  for (const edge of graph.edges) {
    if (!EDGE_TYPE_SET.has(edge.type)) {
      errors.push(`Edge ${edge.id} has invalid type`);
    }
    if (edgeIds.has(edge.id)) {
      errors.push(`Duplicate edge id: ${edge.id}`);
    }
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge ${edge.id} source "${edge.source}" does not exist`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge ${edge.id} target "${edge.target}" does not exist`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    graph,
    warnings: collectStructuralWarnings(graph),
  };
}

export function parseUnknownGraph(raw: unknown): ParseResult {
  const errors: string[] = [];

  if (!isRecord(raw)) {
    return { ok: false, errors: ["Root value must be a JSON object"] };
  }

  if (raw.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${SCHEMA_VERSION}`);
  }

  if (!isRecord(raw.meta)) {
    errors.push("meta must be an object");
    return { ok: false, errors };
  }

  const meta = {
    id: typeof raw.meta.id === "string" ? raw.meta.id : "",
    name: typeof raw.meta.name === "string" ? raw.meta.name : "",
    createdAt:
      typeof raw.meta.createdAt === "string" ? raw.meta.createdAt : "",
    updatedAt:
      typeof raw.meta.updatedAt === "string" ? raw.meta.updatedAt : "",
  };

  if (!Array.isArray(raw.nodes)) {
    errors.push("nodes must be an array");
    return { ok: false, errors };
  }
  if (!Array.isArray(raw.edges)) {
    errors.push("edges must be an array");
    return { ok: false, errors };
  }

  const nodes: PlanningNode[] = [];
  for (let i = 0; i < raw.nodes.length; i++) {
    const node = parseNode(raw.nodes[i], i, errors);
    if (node) {
      nodes.push(node);
    }
  }

  const edges: PlanningEdge[] = [];
  for (let i = 0; i < raw.edges.length; i++) {
    const edge = parseEdge(raw.edges[i], i, errors);
    if (edge) {
      edges.push(edge);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const settingsRaw = raw.settings;
  const settings =
    settingsRaw && isRecord(settingsRaw)
      ? normalizeGraphSettings({
          deleteChildrenOnNodeDelete:
            settingsRaw.deleteChildrenOnNodeDelete === true,
          accessibleColorMode:
            typeof settingsRaw.accessibleColorMode === "number"
              ? settingsRaw.accessibleColorMode
              : undefined,
          accessibleColors: settingsRaw.accessibleColors === true,
          edgeFollowsLabel: settingsRaw.edgeFollowsLabel === true,
          minimalEdgeLabels: settingsRaw.minimalEdgeLabels === true,
        })
      : undefined;

  const customRaw = raw.customNodeTypes;
  const customNodeTypes: PlanningGraph["customNodeTypes"] = [];
  if (customRaw !== undefined) {
    if (!Array.isArray(customRaw)) {
      errors.push("customNodeTypes must be an array");
    } else {
      for (let i = 0; i < customRaw.length; i++) {
        const entry = customRaw[i];
        const path = `customNodeTypes[${i}]`;
        if (!isRecord(entry)) {
          errors.push(`${path} must be an object`);
          continue;
        }
        if (typeof entry.id !== "string" || !entry.id.trim()) {
          errors.push(`${path}.id must be a non-empty string`);
          continue;
        }
        if (typeof entry.label !== "string" || !entry.label.trim()) {
          errors.push(`${path}.label must be a non-empty string`);
          continue;
        }
        if (typeof entry.color !== "string" || !entry.color.trim()) {
          errors.push(`${path}.color must be a non-empty string`);
          continue;
        }
        customNodeTypes.push({
          id: entry.id,
          label: entry.label,
          color: entry.color,
        });
      }
      if (customNodeTypes.length > MAX_CUSTOM_PALETTE_TYPES) {
        errors.push(
          `customNodeTypes must have at most ${MAX_CUSTOM_PALETTE_TYPES} entries`,
        );
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const pagesRaw = raw.customPalettePages;
  let customPalettePages: PlanningGraph["customPalettePages"];
  if (pagesRaw !== undefined) {
    if (!Array.isArray(pagesRaw)) {
      errors.push("customPalettePages must be an array");
    } else {
      customPalettePages = [];
      for (let i = 0; i < pagesRaw.length; i++) {
        const page = pagesRaw[i];
        const path = `customPalettePages[${i}]`;
        if (!isRecord(page)) {
          errors.push(`${path} must be an object`);
          continue;
        }
        if (typeof page.id !== "string" || !page.id.trim()) {
          errors.push(`${path}.id must be a non-empty string`);
          continue;
        }
        const name =
          typeof page.name === "string" && page.name.trim()
            ? page.name.trim()
            : page.id;
        const ids: string[] = [];
        if (Array.isArray(page.customTypeIds)) {
          for (const id of page.customTypeIds) {
            if (typeof id === "string" && id.trim()) {
              ids.push(id);
            }
          }
        }
        customPalettePages.push({ id: page.id, name, customTypeIds: ids });
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const graph: PlanningGraph = normalizeGraph({
    schemaVersion: SCHEMA_VERSION,
    meta,
    nodes,
    edges,
    settings: settings ?? normalizeGraphSettings({ ...DEFAULT_GRAPH_SETTINGS }),
    customNodeTypes,
    customPalettePages,
  });

  return validatePlanningGraph(graph);
}
