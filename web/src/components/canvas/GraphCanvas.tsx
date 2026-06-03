import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Edge,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useGraphCanvasCaptureRef } from "../../context/GraphCanvasCaptureContext";
import { useGraphStore } from "../../store/graphStore";
import { NODE_CARD_CENTER_OFFSET } from "../../graph/folderBounds";
import { getDescendantIds } from "../../graph/nodeHierarchy";
import {
  elevateSubtreeAboveRest,
  elevateSubtreeBand,
} from "../../graph/nodeZIndex";
import {
  FOLDER_NODE_TYPE,
  PLANNING_EDGE_TYPE,
  PLANNING_NODE_TYPE,
  mergeFlowNodesFromGraph,
  toFlowEdges,
  toFlowNodes,
} from "../../graph/reactFlowAdapter";
import { isConnectKey, isTypingTarget } from "../../lib/connectKeyMode";
import { resolveConnectTargetAtPointer } from "../../lib/connectHitTest";
import {
  capturePointerOnNode,
  listenForConnectPointerEnd,
} from "../../lib/connectSession";
import {
  endPaletteDrag,
  getPaletteDragPayload,
  isPaletteDragActive,
} from "../../lib/paletteDrag";
import { CanvasEmptyState } from "./CanvasEmptyState";
import { ConnectDraftLine } from "./ConnectDraftLine";
import { ConnectDraftProvider } from "./ConnectDraftContext";
import { FolderFlowNode } from "./FolderFlowNode";
import { EdgeHitOverlay } from "./EdgeHitOverlay";
import { PlanningFlowEdge } from "./PlanningFlowEdge";
import { PlanningFlowNode } from "./PlanningFlowNode";
import "./canvas.css";

const nodeTypes = {
  [PLANNING_NODE_TYPE]: PlanningFlowNode,
  [FOLDER_NODE_TYPE]: FolderFlowNode,
};

const edgeTypes = {
  [PLANNING_EDGE_TYPE]: PlanningFlowEdge,
};

/** Above edges (1100+) and default nodes while dragging for stack placement. */
const NODE_DRAG_Z_INDEX = 1500;

function GraphCanvasInner() {
  const {
    graph,
    syncCanvas,
    selectNode,
    selectEdge,
    dispatch,
    defaultEdgeType,
    addNode,
    selection,
    deleteSelected,
  } = useGraphStore();
  const { screenToFlowPosition } = useReactFlow();
  const canvasCaptureRef = useGraphCanvasCaptureRef();

  const [connectKeyHeld, setConnectKeyHeld] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [connectHoverId, setConnectHoverId] = useState<string | null>(null);
  const [draftPointer, setDraftPointer] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [paletteDragOver, setPaletteDragOver] = useState(false);
  const connectSourceRef = useRef<string | null>(null);
  const connectHoverRef = useRef<string | null>(null);
  const connectEndingRef = useRef(false);
  const dragSnapshotRef = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );
  /** Subtree last dragged — keeps group z-order until the next drag. */
  const elevatedGroupRef = useRef<Set<string> | null>(null);
  connectSourceRef.current = connectSourceId;
  connectHoverRef.current = connectHoverId;

  const cancelConnect = useCallback(() => {
    setConnectSourceId(null);
    setConnectHoverId(null);
    setDraftPointer(null);
    connectSourceRef.current = null;
    connectHoverRef.current = null;
  }, []);

  const [nodes, setNodes] = useState<Node[]>(() => toFlowNodes(graph));
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const graphRevision = graph.meta.updatedAt;

  const flowEdges = useMemo(
    () =>
      toFlowEdges(
        graph.edges,
        selection?.kind === "edge" ? selection.id : null,
      ),
    [graph.edges, selection],
  );

  const selectedNodeId =
    selection?.kind === "node" ? selection.id : null;

  const displayNodes = useMemo(
    () =>
      nodes.map((node) => {
        const isNodeSelected = node.id === selectedNodeId;
        return {
          ...node,
          selected: isNodeSelected,
          className: isNodeSelected ? "avt-node--selected" : undefined,
          data: {
            ...node.data,
            isCanvasSelected: isNodeSelected,
          },
        };
      }),
    [nodes, selectedNodeId],
  );

  useEffect(() => {
    setNodes((current) => {
      let next = mergeFlowNodesFromGraph(current, graph);
      const group = elevatedGroupRef.current;
      if (group?.size) {
        const zMap = elevateSubtreeAboveRest(graph.nodes, group);
        next = next.map((n) => ({
          ...n,
          zIndex: zMap.get(n.id) ?? n.zIndex,
        }));
      }
      return next;
    });
    // graphRevision bumps on store commits; graph read from this render.
  }, [graphRevision, graph]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || !isConnectKey(event) || isTypingTarget(event.target)) {
        return;
      }
      setConnectKeyHeld(true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (!isConnectKey(event)) {
        return;
      }
      setConnectKeyHeld(false);
      if (!connectSourceRef.current) {
        cancelConnect();
      }
    };
    const onBlur = () => {
      setConnectKeyHeld(false);
      if (!connectSourceRef.current) {
        cancelConnect();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [cancelConnect]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }
      if (isTypingTarget(event.target)) {
        return;
      }
      if (connectKeyHeld || connectSourceId) {
        return;
      }
      if (!selection) {
        return;
      }
      event.preventDefault();
      deleteSelected();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selection, deleteSelected, connectKeyHeld, connectSourceId]);

  const resolveConnectTarget = useCallback(
    (event: PointerEvent, source: string): string | null => {
      return resolveConnectTargetAtPointer(
        event.clientX,
        event.clientY,
        graph,
        source,
      );
    },
    [graph],
  );

  const releaseConnect = useCallback(
    (explicitTargetId: string | null, event: PointerEvent) => {
      if (connectEndingRef.current) {
        return;
      }
      const source = connectSourceRef.current;
      if (!source) {
        return;
      }

      connectEndingRef.current = true;
      try {
        const targetId =
          explicitTargetId && explicitTargetId !== source
            ? explicitTargetId
            : resolveConnectTarget(event, source);
        if (targetId) {
          dispatch({
            type: "connect",
            connection: {
              source,
              target: targetId,
              sourceHandle: null,
              targetHandle: null,
            },
          });
        }
      } finally {
        cancelConnect();
        connectEndingRef.current = false;
      }
    },
    [resolveConnectTarget, dispatch, cancelConnect],
  );

  useEffect(() => {
    if (!connectSourceId) {
      return;
    }

    const onMove = (event: PointerEvent) => {
      setDraftPointer(
        screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      );
      const source = connectSourceRef.current;
      if (!source) {
        return;
      }
      const underPointer = resolveConnectTargetAtPointer(
        event.clientX,
        event.clientY,
        graph,
        source,
      );
      if (underPointer) {
        if (connectHoverRef.current !== underPointer) {
          connectHoverRef.current = underPointer;
          setConnectHoverId(underPointer);
        }
        return;
      }
      if (connectHoverRef.current !== null) {
        connectHoverRef.current = null;
        setConnectHoverId(null);
      }
    };

    document.addEventListener("pointermove", onMove);
    const removePointerEnd = listenForConnectPointerEnd((event) => {
      releaseConnect(null, event);
    });

    return () => {
      document.removeEventListener("pointermove", onMove);
      removePointerEnd();
    };
  }, [connectSourceId, graph, screenToFlowPosition, releaseConnect]);

  const connectDraft = useMemo(
    () => ({
      connectKeyHeld,
      sourceId: connectSourceId,
      hoverId: connectHoverId,
      draftPointer,
      setSourceId: setConnectSourceId,
      setHoverId: (id: string | null) => {
        connectHoverRef.current = id;
        setConnectHoverId(id);
      },
      setDraftPointer,
      startConnect: (
        id: string,
        anchor: { x: number; y: number },
        event: React.PointerEvent,
      ) => {
        capturePointerOnNode(event);
        connectSourceRef.current = id;
        connectHoverRef.current = null;
        setConnectSourceId(id);
        setConnectHoverId(null);
        setDraftPointer(anchor);
      },
      releaseConnect,
      cancelConnect,
    }),
    [
      connectKeyHeld,
      connectSourceId,
      connectHoverId,
      draftPointer,
      releaseConnect,
      cancelConnect,
    ],
  );

  const handlePaletteDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setPaletteDragOver(false);
      endPaletteDrag();

      const payload = getPaletteDragPayload(event.dataTransfer);
      if (!payload) {
        return;
      }

      const flowPoint = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      if (payload.kind === "custom") {
        const position = {
          x: flowPoint.x - NODE_CARD_CENTER_OFFSET.x,
          y: flowPoint.y - NODE_CARD_CENTER_OFFSET.y,
        };
        addNode("custom", position, {
          select: false,
          customTypeId: payload.customTypeId,
        });
        return;
      }

      const nodeType = payload.nodeType;
      const position =
        nodeType === "folder"
          ? flowPoint
          : {
              x: flowPoint.x - NODE_CARD_CENTER_OFFSET.x,
              y: flowPoint.y - NODE_CARD_CENTER_OFFSET.y,
            };
      addNode(nodeType, position, { select: false });
    },
    [addNode, screenToFlowPosition],
  );

  const onCanvasDragOver = useCallback((event: React.DragEvent) => {
    if (!isPaletteDragActive(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setPaletteDragOver(true);
  }, []);

  const onCanvasDragLeave = useCallback((event: React.DragEvent) => {
    const related = event.relatedTarget;
    if (
      related instanceof HTMLElement &&
      event.currentTarget.contains(related)
    ) {
      return;
    }
    setPaletteDragOver(false);
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const change of changes) {
        if (change.type === "select" && change.selected) {
          selectNode(change.id);
          selectEdge(null);
        }
      }
      if (
        changes.some((c) => c.type === "select") &&
        !changes.some((c) => c.type === "select" && c.selected)
      ) {
        selectNode(null);
      }

      for (const change of changes) {
        if (change.type === "remove") {
          dispatch({ type: "delete_node", id: change.id });
        }
      }

      if (changes.length === 0) {
        return;
      }
      setNodes((current) => applyNodeChanges(changes, current) as Node[]);
    },
    [dispatch, selectNode, selectEdge],
  );

  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (connectKeyHeld || connectSourceId) {
        return;
      }
      selectNode(node.id);
      selectEdge(null);
      const ids = [node.id, ...getDescendantIds(graph.nodes, node.id)];
      const idSet = new Set(ids);
      const snap = new Map<string, { x: number; y: number }>();
      for (const id of ids) {
        const n = nodes.find((nd) => nd.id === id);
        if (n) {
          snap.set(id, { x: n.position.x, y: n.position.y });
        }
      }
      dragSnapshotRef.current = snap;
      elevatedGroupRef.current = idSet;
      const dragZ = elevateSubtreeBand(graph.nodes, idSet, NODE_DRAG_Z_INDEX);
      setNodes((current) =>
        current.map((n) =>
          idSet.has(n.id)
            ? { ...n, zIndex: dragZ.get(n.id) ?? NODE_DRAG_Z_INDEX }
            : n,
        ),
      );
    },
    [graph.nodes, nodes, connectKeyHeld, connectSourceId, selectNode, selectEdge],
  );

  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (connectKeyHeld || connectSourceId) {
        return;
      }
      const snap = dragSnapshotRef.current;
      const origin = snap.get(node.id);
      if (!origin) {
        return;
      }
      const dx = node.position.x - origin.x;
      const dy = node.position.y - origin.y;
      if (dx === 0 && dy === 0) {
        return;
      }
      setNodes((current) =>
        current.map((n) => {
          const start = snap.get(n.id);
          if (!start) {
            return n;
          }
          return {
            ...n,
            position: { x: start.x + dx, y: start.y + dy },
          };
        }),
      );
    },
    [connectKeyHeld, connectSourceId],
  );

  const onNodeDragStop = useCallback(() => {
    const reassigned = [...dragSnapshotRef.current.keys()];
    elevatedGroupRef.current = new Set(reassigned);
    dragSnapshotRef.current = new Map();
    queueMicrotask(() => syncCanvas(nodesRef.current, reassigned));
  }, [syncCanvas]);

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      if (deleted.length === 0) {
        return;
      }
      dispatch({
        type: "remove_edges",
        edgeIds: deleted.map((edge) => edge.id),
      });
    },
    [dispatch],
  );

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (connectKeyHeld || connectSourceId) {
        return;
      }
      event.stopPropagation();
      selectEdge(edge.id);
      selectNode(null);
    },
    [connectKeyHeld, connectSourceId, selectEdge, selectNode],
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (connectKeyHeld || connectSourceId) {
        return;
      }
      event.stopPropagation();
      selectNode(node.id);
      selectEdge(null);
    },
    [connectKeyHeld, connectSourceId, selectNode, selectEdge],
  );

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (connectKeyHeld || connectSourceId) {
        return;
      }
      const target = event.target as HTMLElement;
      if (target.closest(".edge-label")) {
        return;
      }
      if (
        !target.classList.contains("react-flow__pane") &&
        !target.classList.contains("react-flow__background")
      ) {
        return;
      }
      selectNode(null);
      selectEdge(null);
    },
    [connectKeyHeld, connectSourceId, selectNode, selectEdge],
  );

  return (
    <ConnectDraftProvider value={connectDraft}>
      <div
        ref={canvasCaptureRef}
        className={`graph-canvas${connectKeyHeld || connectSourceId ? " graph-canvas--connecting" : ""}${paletteDragOver ? " graph-canvas--drop-target" : ""}`}
        onDragOver={onCanvasDragOver}
        onDragLeave={onCanvasDragLeave}
        onDrop={handlePaletteDrop}
      >
        <CanvasEmptyState />
        {connectKeyHeld ? (
          <div className="connect-banner">
            Hold <kbd>C</kbd> — drag from a node; line snaps on hover ·{" "}
            <strong>{defaultEdgeType.replace(/_/g, " ")}</strong>
          </div>
        ) : null}
        <ConnectDraftLine />
        <ReactFlow
          nodes={displayNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onNodeDragStart={onNodeDragStart}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onEdgesDelete={onEdgesDelete}
          nodesConnectable={false}
          edgesFocusable
          connectionMode={ConnectionMode.Loose}
          elementsSelectable
          selectNodesOnDrag={false}
          nodesDraggable={!connectKeyHeld && !connectSourceId}
          panOnDrag={
            connectKeyHeld || connectSourceId ? false : [0, 1, 2]
          }
          zoomOnScroll
          selectionOnDrag={false}
          nodesFocusable
          nodeClickDistance={8}
          autoPanOnNodeDrag={false}
          autoPanOnConnect={false}
          zoomOnDoubleClick={false}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          deleteKeyCode={["Backspace", "Delete"]}
          multiSelectionKeyCode="Shift"
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} />
          <Controls />
          <MiniMap zoomable pannable />
          <EdgeHitOverlay
            disabled={connectKeyHeld || !!connectSourceId}
          />
        </ReactFlow>
      </div>
    </ConnectDraftProvider>
  );
}

export function GraphCanvas() {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner />
    </ReactFlowProvider>
  );
}
