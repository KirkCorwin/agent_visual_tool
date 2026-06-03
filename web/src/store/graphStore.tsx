import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { Connection, Node } from "@xyflow/react";
import {
  createEdge,
  createEmptyGraph,
  createInitialEditorGraph,
  createNode,
  newId,
  normalizeGraph,
  touchGraph,
} from "../graph/defaults";
import { mergeGraphWithImplicitEdges } from "../graph/implicitEdges";
import {
  findStackParent,
  getDescendantIds,
  getNodeCenter,
  resolveFolderIdForNode,
} from "../graph/nodeHierarchy";
import { createSampleGraph } from "../graph/sampleGraph";
import type {
  CustomPaletteType,
  EdgeData,
  EdgeDataPatch,
  EdgeType,
  GraphEditorSettings,
  GraphPosition,
  NodeData,
  NodeType,
  PlanningEdge,
  PlanningGraph,
} from "../graph/types";
import { nextCustomPinkColor } from "../graph/nodeColors";
import { MAX_CUSTOM_PALETTE_TYPES } from "../lib/customPaletteLimits";
import { applyCanvasState } from "../graph/reactFlowAdapter";
import { parsePlanningGraphJson, serializePlanningGraph } from "../graph/serialize";
import { validatePlanningGraph } from "../graph/validation";
import {
  applyEditorSettingsToProject,
  buildEditorSettingsBundle,
} from "../graph/applyEditorSettings";
import { DEFAULT_CUSTOM_NODE_PROMPT } from "../graph/defaultPrompts";
import {
  DEFAULT_EDITOR_CONFIG,
  DEFAULT_STACK_EDGE_MAPPING,
  editorConfigForPersistence,
  normalizeEditorConfig,
  parseEditorConfigJson,
  serializeEditorConfig,
  type EditorConfig,
} from "../graph/editorConfig";
import {
  appendTypeToPage,
  createDefaultPalettePages,
  moveTypeInPages,
  removeTypeFromAllPages,
  reorderTypeInPage,
  renamePageInPages,
} from "../lib/paletteLayout";
import {
  buildClipboardFromSelection,
  pasteClipboard,
  type NodeClipboard,
} from "../lib/duplicateNodes";
import { downloadTextFile, editorSettingsFileName, graphFileName } from "../lib/fileIO";
import {
  getSelectedNodeIds,
  type Selection,
} from "./selection";

export type { Selection } from "./selection";

const EDITOR_CONFIG_STORAGE_KEY = "avt-editor-config";

function loadStoredEditorConfig(): EditorConfig {
  try {
    const raw = localStorage.getItem(EDITOR_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = parseEditorConfigJson(raw);
      if (parsed.ok) {
        return parsed.config;
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_EDITOR_CONFIG;
}

function persistEditorConfig(config: EditorConfig): void {
  try {
    localStorage.setItem(
      EDITOR_CONFIG_STORAGE_KEY,
      serializeEditorConfig(editorConfigForPersistence(config)),
    );
  } catch {
    /* ignore */
  }
}

export type GraphStoreState = {
  graph: PlanningGraph;
  editorConfig: EditorConfig;
  defaultEdgeType: EdgeType;
  selection: Selection;
  clipboard: NodeClipboard | null;
  warnings: string[];
  loadError: string | null;
};

type GraphAction =
  | { type: "set_graph"; graph: PlanningGraph }
  | { type: "set_default_edge_type"; edgeType: EdgeType }
  | { type: "set_selection"; selection: Selection }
  | { type: "clear_edge_selection" }
  | {
      type: "add_node";
      nodeType: NodeType;
      position?: { x: number; y: number };
      customTypeId?: string;
      data?: Partial<NodeData>;
      /** When false, viewport selection does not jump to the new node (e.g. palette drop). */
      select?: boolean;
    }
  | { type: "set_graph_settings"; settings: Partial<GraphEditorSettings> }
  | { type: "set_editor_config"; config: Partial<EditorConfig> }
  | { type: "load_editor_config"; config: EditorConfig }
  | { type: "copy_selection" }
  | { type: "paste_clipboard" }
  | { type: "set_selection_nodes"; ids: string[] }
  | { type: "add_custom_palette_type"; pageId?: string }
  | { type: "remove_custom_palette_type"; id: string }
  | { type: "update_custom_palette_type"; id: string; label: string }
  | {
      type: "move_custom_palette_type";
      typeId: string;
      toPageId: string;
      toIndex: number;
    }
  | {
      type: "reorder_custom_palette_type";
      pageId: string;
      fromIndex: number;
      toIndex: number;
    }
  | { type: "rename_palette_page"; pageId: string; name: string }
  | { type: "load_editor_settings"; config: Partial<EditorConfig> }
  | { type: "update_node"; id: string; data: Partial<NodeData> }
  | { type: "set_node_type"; id: string; nodeType: NodeType; customTypeId?: string }
  | {
      type: "update_node_layout";
      id: string;
      position?: GraphPosition;
      parentId?: string | null;
      folderId?: string | null;
      data?: Partial<NodeData>;
    }
  | { type: "delete_node"; id: string }
  | {
      type: "sync_canvas";
      nodes: import("@xyflow/react").Node[];
      reassignParentIds?: string[];
    }
  | { type: "update_edge"; id: string; patch: EdgeDataPatch }
  | { type: "delete_edge"; id: string }
  | { type: "connect"; connection: Connection }
  | { type: "sync_positions"; nodes: Node[] }
  | { type: "remove_edges"; edgeIds: string[] }
  | { type: "set_load_error"; error: string | null }
  | { type: "update_meta"; name: string };

function commitGraph(
  graph: PlanningGraph,
  state: GraphStoreState,
): GraphStoreState {
  const touched = touchGraph(
    mergeGraphWithImplicitEdges(
      graph,
      state.editorConfig?.stackEdgeMapping ?? DEFAULT_STACK_EDGE_MAPPING,
    ),
  );
  const validation = validatePlanningGraph(touched);
  return {
    ...state,
    graph: touched,
    warnings: validation.ok ? validation.warnings : [],
  };
}

export function graphReducer(
  state: GraphStoreState,
  action: GraphAction,
): GraphStoreState {
  switch (action.type) {
    case "set_graph":
      return commitGraph(normalizeGraph(action.graph), {
        ...state,
        selection: null,
        loadError: null,
      });

    case "set_load_error":
      return { ...state, loadError: action.error };

    case "update_meta": {
      const name = action.name.trim() || "Untitled project";
      return commitGraph(
        {
          ...state.graph,
          meta: { ...state.graph.meta, name },
        },
        state,
      );
    }

    case "set_default_edge_type":
      return { ...state, defaultEdgeType: action.edgeType };

    case "set_selection":
      return { ...state, selection: action.selection };

    case "clear_edge_selection":
      if (state.selection?.kind !== "edge") {
        return state;
      }
      return { ...state, selection: null };

    case "set_graph_settings": {
      return commitGraph(
        {
          ...state.graph,
          settings: {
            ...state.graph.settings!,
            ...action.settings,
          },
        },
        state,
      );
    }

    case "set_editor_config": {
      const editorConfig = normalizeEditorConfig({
        ...state.editorConfig,
        ...action.config,
        stackEdgeMapping: action.config.stackEdgeMapping
          ? {
              ...state.editorConfig.stackEdgeMapping,
              ...action.config.stackEdgeMapping,
              childToParent: {
                ...state.editorConfig.stackEdgeMapping.childToParent,
                ...action.config.stackEdgeMapping?.childToParent,
              },
              parentToChild: {
                ...state.editorConfig.stackEdgeMapping.parentToChild,
                ...action.config.stackEdgeMapping?.parentToChild,
              },
            }
          : state.editorConfig.stackEdgeMapping,
        nodePrompts: action.config.nodePrompts
          ? { ...state.editorConfig.nodePrompts, ...action.config.nodePrompts }
          : state.editorConfig.nodePrompts,
        customPromptsByTypeId: action.config.customPromptsByTypeId
          ? {
              ...state.editorConfig.customPromptsByTypeId,
              ...action.config.customPromptsByTypeId,
            }
          : state.editorConfig.customPromptsByTypeId,
        customEdgePresets: action.config.customEdgePresets
          ? action.config.customEdgePresets
          : state.editorConfig.customEdgePresets,
      });
      persistEditorConfig(editorConfig);
      return commitGraph(state.graph, { ...state, editorConfig });
    }

    case "load_editor_config": {
      const editorConfig = editorConfigForPersistence(
        normalizeEditorConfig(action.config),
      );
      persistEditorConfig(editorConfig);
      return commitGraph(state.graph, { ...state, editorConfig });
    }

    case "load_editor_settings": {
      const { graph, editorConfig } = applyEditorSettingsToProject(
        state.graph,
        action.config,
      );
      const stored = editorConfigForPersistence(editorConfig);
      persistEditorConfig(stored);
      return commitGraph(graph, { ...state, editorConfig: stored });
    }

    case "copy_selection": {
      const ids = getSelectedNodeIds(state.selection);
      if (ids.length === 0) {
        return state;
      }
      const clipboard = buildClipboardFromSelection(
        state.graph.nodes,
        state.graph.edges,
        ids,
        state.editorConfig.copyEdgesOnPaste,
      );
      return { ...state, clipboard };
    }

    case "paste_clipboard": {
      if (!state.clipboard || state.clipboard.nodes.length === 0) {
        return state;
      }
      const { nodes, edges, newRootIds } = pasteClipboard(
        state.graph.nodes,
        state.graph.edges,
        state.clipboard,
        state.editorConfig.copyEdgesOnPaste,
      );
      return commitGraph(
        { ...state.graph, nodes, edges },
        {
          ...state,
          selection: { kind: "nodes", ids: newRootIds },
        },
      );
    }

    case "set_selection_nodes": {
      const ids = [...new Set(action.ids)];
      return {
        ...state,
        selection: ids.length > 0 ? { kind: "nodes", ids } : null,
      };
    }

    case "add_custom_palette_type": {
      const existing = state.graph.customNodeTypes ?? [];
      if (existing.length >= MAX_CUSTOM_PALETTE_TYPES) {
        return state;
      }
      const entry: CustomPaletteType = {
        id: newId(),
        label: `Custom ${existing.length + 1}`,
        color: nextCustomPinkColor(existing),
      };
      const pages = state.graph.customPalettePages ?? createDefaultPalettePages();
      const pageId = action.pageId ?? "palette-1";
      const customPalettePages = appendTypeToPage(pages, pageId, entry.id);
      const editorConfig = {
        ...state.editorConfig,
        customPromptsByTypeId: {
          ...state.editorConfig.customPromptsByTypeId,
          [entry.id]: DEFAULT_CUSTOM_NODE_PROMPT,
        },
      };
      persistEditorConfig(editorConfig);
      return commitGraph(
        {
          ...state.graph,
          customNodeTypes: [...existing, entry],
          customPalettePages,
        },
        { ...state, editorConfig },
      );
    }

    case "remove_custom_palette_type": {
      const customNodeTypes = (state.graph.customNodeTypes ?? []).filter(
        (t) => t.id !== action.id,
      );
      const pages = removeTypeFromAllPages(
        state.graph.customPalettePages ?? [],
        action.id,
      );
      const { [action.id]: _removed, ...customPromptsByTypeId } =
        state.editorConfig.customPromptsByTypeId;
      const editorConfig = { ...state.editorConfig, customPromptsByTypeId };
      persistEditorConfig(editorConfig);
      return commitGraph(
        { ...state.graph, customNodeTypes, customPalettePages: pages },
        { ...state, editorConfig },
      );
    }

    case "move_custom_palette_type": {
      const pages = moveTypeInPages(
        state.graph.customPalettePages ?? [],
        action.typeId,
        action.toPageId,
        action.toIndex,
      );
      return commitGraph({ ...state.graph, customPalettePages: pages }, state);
    }

    case "reorder_custom_palette_type": {
      const pages = reorderTypeInPage(
        state.graph.customPalettePages ?? [],
        action.pageId,
        action.fromIndex,
        action.toIndex,
      );
      return commitGraph({ ...state.graph, customPalettePages: pages }, state);
    }

    case "rename_palette_page": {
      const pages = renamePageInPages(
        state.graph.customPalettePages ?? [],
        action.pageId,
        action.name,
      );
      return commitGraph({ ...state.graph, customPalettePages: pages }, state);
    }

    case "update_custom_palette_type": {
      const label = action.label.trim() || "Custom";
      const customNodeTypes = (state.graph.customNodeTypes ?? []).map((t) =>
        t.id === action.id ? { ...t, label } : t,
      );
      return commitGraph({ ...state.graph, customNodeTypes }, state);
    }

    case "add_node": {
      const offset = state.graph.nodes.length * 24;
      const position = action.position ?? {
        x: 120 + offset,
        y: 120 + offset,
      };
      const customType =
        action.nodeType === "custom" && action.customTypeId
          ? state.graph.customNodeTypes?.find((t) => t.id === action.customTypeId)
          : undefined;
      const node = createNode(action.nodeType, {
        position,
        data: {
          ...action.data,
          ...(action.nodeType === "custom" && action.customTypeId
            ? {
                customTypeId: action.customTypeId,
                title: action.data?.title ?? customType?.label ?? "Custom",
              }
            : undefined),
        },
      });
      const center = getNodeCenter(node);
      const parent = findStackParent(center, [...state.graph.nodes, node], node.id);
      if (parent) {
        node.parentId = parent.id;
        const nodesById = new Map(
          [...state.graph.nodes, node].map((n) => [n.id, n]),
        );
        node.folderId = resolveFolderIdForNode(node, nodesById);
      }
      const select = action.select !== false;
      return commitGraph(
        { ...state.graph, nodes: [...state.graph.nodes, node] },
        {
          ...state,
          selection: select
            ? { kind: "nodes", ids: [node.id] }
            : state.selection,
        },
      );
    }

    case "update_node": {
      const nodes = state.graph.nodes.map((node) =>
        node.id === action.id
          ? { ...node, data: { ...node.data, ...action.data } }
          : node,
      );
      return commitGraph({ ...state.graph, nodes }, state);
    }

    case "set_node_type": {
      const nodes = state.graph.nodes.map((node) => {
        if (node.id !== action.id) {
          return node;
        }
        if (node.type === "folder" || action.nodeType === "folder") {
          return node;
        }
        const data = { ...node.data };
        if (action.nodeType !== "agent") {
          delete data.role;
        }
        if (action.nodeType === "custom") {
          const customTypeId =
            action.customTypeId ??
            data.customTypeId ??
            state.graph.customNodeTypes?.[0]?.id;
          if (!customTypeId) {
            return node;
          }
          data.customTypeId = customTypeId;
          const custom = state.graph.customNodeTypes?.find(
            (t) => t.id === customTypeId,
          );
          if (!data.title?.trim() || node.type !== "custom") {
            data.title = custom?.label ?? data.title ?? "Custom";
          }
        } else {
          delete data.customTypeId;
        }
        if (
          node.type === action.nodeType &&
          action.nodeType !== "custom"
        ) {
          return node;
        }
        if (
          node.type === "custom" &&
          action.nodeType === "custom" &&
          data.customTypeId === node.data.customTypeId
        ) {
          return node;
        }
        return { ...node, type: action.nodeType, data };
      });
      return commitGraph({ ...state.graph, nodes }, state);
    }

    case "update_node_layout": {
      const nodes = state.graph.nodes.map((node) => {
        if (node.id !== action.id) {
          return node;
        }
        const nextParentId =
          action.parentId === null
            ? undefined
            : action.parentId !== undefined
              ? action.parentId
              : node.parentId;
        const nextNode = {
          ...node,
          position: action.position ?? node.position,
          parentId: nextParentId,
          data: action.data ? { ...node.data, ...action.data } : node.data,
        };
        const nodesById = new Map(
          state.graph.nodes.map((n) => [
            n.id,
            n.id === action.id ? nextNode : n,
          ]),
        );
        return {
          ...nextNode,
          folderId: nextParentId
            ? resolveFolderIdForNode(nextNode, nodesById)
            : undefined,
        };
      });
      return commitGraph({ ...state.graph, nodes }, state);
    }

    case "delete_node": {
      const deleteChildren =
        state.graph.settings?.deleteChildrenOnNodeDelete === true;
      const removeIds = new Set(
        deleteChildren
          ? [action.id, ...getDescendantIds(state.graph.nodes, action.id)]
          : [action.id],
      );
      const nodes = state.graph.nodes
        .filter((n) => !removeIds.has(n.id))
        .map((n) =>
          n.parentId && removeIds.has(n.parentId)
            ? { ...n, parentId: undefined, folderId: undefined }
            : n,
        );
      const edges = state.graph.edges.filter(
        (e) => !removeIds.has(e.source) && !removeIds.has(e.target),
      );
      const selected = getSelectedNodeIds(state.selection);
      const nextSelected = selected.filter((id) => !removeIds.has(id));
      const selection: Selection =
        state.selection?.kind === "nodes"
          ? nextSelected.length > 0
            ? { kind: "nodes", ids: nextSelected }
            : null
          : state.selection;
      return commitGraph({ ...state.graph, nodes, edges }, { ...state, selection });
    }

    case "update_edge": {
      const edges = state.graph.edges.map((edge) => {
        if (edge.id !== action.id) {
          return edge;
        }
        const { edgeType, label, isCustom, labelDrag } = action.patch;
        const { description: _legacy, ...prevData } = (edge.data ?? {}) as EdgeData & {
          description?: string;
        };
        const nextData: EdgeData = { ...prevData };
        if (label !== undefined) {
          nextData.label = label.trim() ? label.trim() : undefined;
        }
        if (isCustom !== undefined) {
          if (isCustom) {
            nextData.isCustom = true;
          } else {
            delete nextData.isCustom;
          }
        }
        if (labelDrag !== undefined) {
          if (Math.hypot(labelDrag.dx, labelDrag.dy) < 0.5) {
            delete nextData.labelDrag;
          } else {
            nextData.labelDrag = {
              dx: labelDrag.dx,
              dy: labelDrag.dy,
            };
          }
        }
        const hasData = Boolean(
          nextData.label || nextData.isCustom || nextData.labelDrag,
        );
        return {
          ...edge,
          type: edgeType ?? edge.type,
          data: hasData ? nextData : undefined,
        };
      });
      return commitGraph({ ...state.graph, edges }, state);
    }

    case "delete_edge": {
      const edges = state.graph.edges.filter((e) => e.id !== action.id);
      const selection =
        state.selection?.kind === "edge" && state.selection.id === action.id
          ? null
          : state.selection;
      return commitGraph({ ...state.graph, edges }, { ...state, selection });
    }

    case "connect": {
      const { source, target } = action.connection;
      if (!source || !target || source === target) {
        return state;
      }
      const edge = createEdge(state.defaultEdgeType, source, target);
      return commitGraph(
        { ...state.graph, edges: [...state.graph.edges, edge] },
        { ...state, selection: { kind: "edge", id: edge.id } },
      );
    }

    case "sync_canvas": {
      const reassignParentIds = action.reassignParentIds?.length
        ? new Set(action.reassignParentIds)
        : undefined;
      return commitGraph(
        applyCanvasState(state.graph, action.nodes, { reassignParentIds }),
        state,
      );
    }

    case "sync_positions":
      return commitGraph(applyCanvasState(state.graph, action.nodes), state);

    case "remove_edges": {
      const remove = new Set(action.edgeIds);
      const edges = state.graph.edges.filter((e) => !remove.has(e.id));
      const selection =
        state.selection?.kind === "edge" && remove.has(state.selection.id)
          ? null
          : state.selection;
      return commitGraph({ ...state.graph, edges }, { ...state, selection });
    }

    default:
      return state;
  }
}

type GraphStoreValue = {
  graph: PlanningGraph;
  editorConfig: EditorConfig;
  defaultEdgeType: EdgeType;
  selection: Selection;
  selectedNodeIds: string[];
  selectedNodes: PlanningGraph["nodes"];
  warnings: string[];
  selectedNode: PlanningGraph["nodes"][number] | null;
  selectedEdge: PlanningEdge | null;
  dispatch: React.Dispatch<GraphAction>;
  addNode: (
    nodeType: NodeType,
    position?: GraphPosition,
    options?: {
      select?: boolean;
      customTypeId?: string;
      data?: Partial<NodeData>;
    },
  ) => void;
  setGraphSettings: (settings: Partial<GraphEditorSettings>) => void;
  setEditorConfig: (config: Partial<EditorConfig>) => void;
  saveEditorConfigToFile: () => void;
  loadEditorConfigFromJson: (json: string) => boolean;
  copySelection: () => void;
  pasteClipboard: () => void;
  addCustomPaletteType: (pageId?: string) => void;
  removeCustomPaletteType: (id: string) => void;
  updateCustomPaletteType: (id: string, label: string) => void;
  moveCustomPaletteType: (
    typeId: string,
    toPageId: string,
    toIndex: number,
  ) => void;
  reorderCustomPaletteType: (
    pageId: string,
    fromIndex: number,
    toIndex: number,
  ) => void;
  renamePalettePage: (pageId: string, name: string) => void;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  setNodeType: (id: string, nodeType: NodeType, customTypeId?: string) => void;
  deleteSelected: () => void;
  setDefaultEdgeType: (edgeType: EdgeType) => void;
  selectNode: (id: string | null) => void;
  selectNodes: (ids: string[]) => void;
  selectEdge: (id: string | null) => void;
  onConnect: (connection: Connection) => void;
  syncCanvas: (nodes: Node[], reassignParentIds?: Iterable<string>) => void;
  updateSelectedEdge: (patch: EdgeDataPatch) => void;
  loadError: string | null;
  saveGraphToFile: () => void;
  loadGraphFromJson: (json: string) => boolean;
  reportLoadError: (message: string) => void;
  clearLoadError: () => void;
  updateGraphName: (name: string) => void;
  loadSampleGraph: () => void;
  newBlankGraph: () => void;
};

const GraphStoreContext = createContext<GraphStoreValue | null>(null);

export function createTestGraphStoreState(
  partial: Partial<GraphStoreState> = {},
): GraphStoreState {
  return { ...initialState, ...partial };
}

const initialState: GraphStoreState = {
  graph: createInitialEditorGraph(),
  editorConfig: loadStoredEditorConfig(),
  defaultEdgeType: "depends_on",
  selection: null,
  clipboard: null,
  warnings: [],
  loadError: null,
};

export function GraphStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(graphReducer, initialState);

  const selectedNodeIds = useMemo(
    () => getSelectedNodeIds(state.selection),
    [state.selection],
  );

  const selectedNode = useMemo(() => {
    if (selectedNodeIds.length !== 1) {
      return null;
    }
    return state.graph.nodes.find((n) => n.id === selectedNodeIds[0]) ?? null;
  }, [state.graph.nodes, selectedNodeIds]);

  const selectedNodes = useMemo(() => {
    const idSet = new Set(selectedNodeIds);
    return state.graph.nodes.filter((n) => idSet.has(n.id));
  }, [state.graph.nodes, selectedNodeIds]);

  const selectedEdge = useMemo(() => {
    const sel = state.selection;
    if (sel?.kind !== "edge") {
      return null;
    }
    return state.graph.edges.find((e) => e.id === sel.id) ?? null;
  }, [state.graph.edges, state.selection]);

  const addNode = useCallback(
    (
      nodeType: NodeType,
      position?: GraphPosition,
      options?: {
        select?: boolean;
        customTypeId?: string;
        data?: Partial<NodeData>;
      },
    ) => {
      dispatch({
        type: "add_node",
        nodeType,
        position,
        select: options?.select,
        customTypeId: options?.customTypeId,
        data: options?.data,
      });
    },
    [],
  );

  const setGraphSettings = useCallback((settings: Partial<GraphEditorSettings>) => {
    dispatch({ type: "set_graph_settings", settings });
  }, []);

  const addCustomPaletteType = useCallback((pageId?: string) => {
    dispatch({ type: "add_custom_palette_type", pageId });
  }, []);

  const removeCustomPaletteType = useCallback((id: string) => {
    dispatch({ type: "remove_custom_palette_type", id });
  }, []);

  const updateCustomPaletteType = useCallback((id: string, label: string) => {
    dispatch({ type: "update_custom_palette_type", id, label });
  }, []);

  const moveCustomPaletteType = useCallback(
    (typeId: string, toPageId: string, toIndex: number) => {
      dispatch({ type: "move_custom_palette_type", typeId, toPageId, toIndex });
    },
    [],
  );

  const reorderCustomPaletteType = useCallback(
    (pageId: string, fromIndex: number, toIndex: number) => {
      dispatch({
        type: "reorder_custom_palette_type",
        pageId,
        fromIndex,
        toIndex,
      });
    },
    [],
  );

  const renamePalettePage = useCallback((pageId: string, name: string) => {
    dispatch({ type: "rename_palette_page", pageId, name });
  }, []);

  const updateNodeData = useCallback((id: string, data: Partial<NodeData>) => {
    dispatch({ type: "update_node", id, data });
  }, []);

  const setNodeType = useCallback(
    (id: string, nodeType: NodeType, customTypeId?: string) => {
      dispatch({ type: "set_node_type", id, nodeType, customTypeId });
    },
    [],
  );

  const deleteSelected = useCallback(() => {
    const ids = getSelectedNodeIds(state.selection);
    if (ids.length > 0) {
      for (const id of ids) {
        dispatch({ type: "delete_node", id });
      }
      return;
    }
    if (state.selection?.kind === "edge") {
      dispatch({ type: "delete_edge", id: state.selection.id });
    }
  }, [state.selection]);

  const setDefaultEdgeType = useCallback((edgeType: EdgeType) => {
    dispatch({ type: "set_default_edge_type", edgeType });
  }, []);

  const selectNode = useCallback((id: string | null) => {
    dispatch({
      type: "set_selection",
      selection: id ? { kind: "nodes", ids: [id] } : null,
    });
  }, []);

  const selectNodes = useCallback((ids: string[]) => {
    dispatch({ type: "set_selection_nodes", ids });
  }, []);

  const copySelection = useCallback(() => {
    dispatch({ type: "copy_selection" });
  }, []);

  const pasteClipboard = useCallback(() => {
    dispatch({ type: "paste_clipboard" });
  }, []);

  const setEditorConfig = useCallback((config: Partial<EditorConfig>) => {
    dispatch({ type: "set_editor_config", config });
  }, []);

  const loadEditorConfigFromJson = useCallback((json: string): boolean => {
    const result = parseEditorConfigJson(json);
    if (!result.ok) {
      dispatch({ type: "set_load_error", error: result.error });
      return false;
    }
    dispatch({ type: "load_editor_settings", config: result.config });
    return true;
  }, []);

  const saveEditorConfigToFile = useCallback(() => {
    const exportConfig: EditorConfig = {
      ...state.editorConfig,
      settingsBundle: buildEditorSettingsBundle(state.graph),
    };
    downloadTextFile(
      editorSettingsFileName(state.graph),
      serializeEditorConfig(exportConfig),
    );
  }, [state.graph, state.editorConfig]);

  const selectEdge = useCallback((id: string | null) => {
    if (id) {
      dispatch({
        type: "set_selection",
        selection: { kind: "edge", id },
      });
      return;
    }
    dispatch({ type: "clear_edge_selection" });
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    dispatch({ type: "connect", connection });
  }, []);

  const syncCanvas = useCallback(
    (nodes: Node[], reassignParentIds?: Iterable<string>) => {
      dispatch({
        type: "sync_canvas",
        nodes,
        reassignParentIds: reassignParentIds
          ? [...reassignParentIds]
          : undefined,
      });
    },
    [],
  );

  const updateSelectedEdge = useCallback(
    (patch: EdgeDataPatch) => {
      if (state.selection?.kind !== "edge") {
        return;
      }
      dispatch({
        type: "update_edge",
        id: state.selection.id,
        patch,
      });
    },
    [state.selection],
  );

  const clearLoadError = useCallback(() => {
    dispatch({ type: "set_load_error", error: null });
  }, []);

  const saveGraphToFile = useCallback(() => {
    const json = serializePlanningGraph(state.graph);
    downloadTextFile(graphFileName(state.graph), json);
  }, [state.graph]);

  const reportLoadError = useCallback((message: string) => {
    dispatch({ type: "set_load_error", error: message });
  }, []);

  const loadGraphFromJson = useCallback((json: string): boolean => {
    const result = parsePlanningGraphJson(json);
    if (!result.ok) {
      dispatch({
        type: "set_load_error",
        error: result.errors.join(" "),
      });
      return false;
    }
    dispatch({ type: "set_graph", graph: result.graph });
    return true;
  }, []);

  const updateGraphName = useCallback((name: string) => {
    dispatch({ type: "update_meta", name });
  }, []);

  const loadSampleGraph = useCallback(() => {
    dispatch({ type: "set_graph", graph: createSampleGraph() });
  }, []);

  const newBlankGraph = useCallback(() => {
    const graph = createEmptyGraph();
    graph.nodes.push(
      createNode("project", {
        position: { x: 120, y: 80 },
        data: { title: "New project" },
      }),
    );
    dispatch({ type: "set_graph", graph });
  }, []);

  const value = useMemo<GraphStoreValue>(
    () => ({
      graph: state.graph,
      editorConfig: state.editorConfig,
      defaultEdgeType: state.defaultEdgeType,
      selection: state.selection,
      selectedNodeIds,
      selectedNodes,
      warnings: state.warnings,
      selectedNode,
      selectedEdge,
      dispatch,
      addNode,
      setGraphSettings,
      setEditorConfig,
      saveEditorConfigToFile,
      loadEditorConfigFromJson,
      copySelection,
      pasteClipboard,
      addCustomPaletteType,
      removeCustomPaletteType,
      updateCustomPaletteType,
      moveCustomPaletteType,
      reorderCustomPaletteType,
      renamePalettePage,
      updateNodeData,
      setNodeType,
      deleteSelected,
      setDefaultEdgeType,
      selectNode,
      selectNodes,
      selectEdge,
      onConnect,
      syncCanvas,
      updateSelectedEdge,
      loadError: state.loadError,
      saveGraphToFile,
      loadGraphFromJson,
      reportLoadError,
      clearLoadError,
      updateGraphName,
      loadSampleGraph,
      newBlankGraph,
    }),
    [
      state,
      selectedNodeIds,
      selectedNodes,
      selectedNode,
      selectedEdge,
      addNode,
      setGraphSettings,
      setEditorConfig,
      saveEditorConfigToFile,
      loadEditorConfigFromJson,
      copySelection,
      pasteClipboard,
      addCustomPaletteType,
      removeCustomPaletteType,
      updateCustomPaletteType,
      moveCustomPaletteType,
      reorderCustomPaletteType,
      renamePalettePage,
      updateNodeData,
      setNodeType,
      deleteSelected,
      setDefaultEdgeType,
      selectNode,
      selectNodes,
      selectEdge,
      onConnect,
      syncCanvas,
      updateSelectedEdge,
      saveGraphToFile,
      loadGraphFromJson,
      reportLoadError,
      clearLoadError,
      updateGraphName,
      loadSampleGraph,
      newBlankGraph,
      moveCustomPaletteType,
      reorderCustomPaletteType,
      renamePalettePage,
    ],
  );

  return (
    <GraphStoreContext.Provider value={value}>
      {children}
    </GraphStoreContext.Provider>
  );
}

export function useGraphStore(): GraphStoreValue {
  const ctx = useContext(GraphStoreContext);
  if (!ctx) {
    throw new Error("useGraphStore must be used within GraphStoreProvider");
  }
  return ctx;
}
