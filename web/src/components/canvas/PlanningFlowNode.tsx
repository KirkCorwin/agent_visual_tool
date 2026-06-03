import { useState } from "react";

import { type NodeProps, useReactFlow } from "@xyflow/react";

import type { PlanningNodeFlowData } from "../../graph/reactFlowAdapter";

import { getFlowNodeCenter } from "../../lib/nodeConnectAnchor";
import { nodeHasNestedChildren } from "../../graph/nodeHierarchy";

import { useGraphStore } from "../../store/graphStore";
import { useIsNodeSelected } from "../../store/useNodeSelected";

import { InlineEditable } from "../shared/InlineEditable";

import { NodeTypeMenu } from "../shared/NodeTypeMenu";

import { useConnectDraft } from "./ConnectDraftContext";

import { NodeConnectionHandles } from "./NodeConnectionHandles";

import {
  PLANNING_NODE_HEIGHT,
  PLANNING_NODE_MIN_HEIGHT,
  PLANNING_NODE_MIN_WIDTH,
  PLANNING_NODE_WIDTH,
} from "../../graph/folderBounds";

import { NodeCornerResizer } from "./NodeCornerResizer";

import {
  resolveNodeBorderColor,
  resolveNodeTypeLabel,
} from "./nodeStyles";



export function PlanningFlowNode({ data, selected, id, width, height }: NodeProps) {

  const nodeData = data as PlanningNodeFlowData;

  const { updateNodeData, graph, dispatch, selectNode, selectEdge } =
    useGraphStore();
  const isSelected = useIsNodeSelected(id);
  const planningNode = graph.nodes.find((n) => n.id === id);
  const color = planningNode
    ? resolveNodeBorderColor(graph, planningNode)
    : resolveNodeBorderColor(graph, {
        id,
        type: nodeData.planningType,
        position: { x: 0, y: 0 },
        data: {
          title: nodeData.title,
          customTypeId: nodeData.customTypeId,
        },
      });
  const typeLabel = planningNode
    ? resolveNodeTypeLabel(graph, planningNode)
    : nodeData.planningType;
  const [liveSize, setLiveSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const showSelected = isSelected || selected || nodeData.isCanvasSelected === true;

  const {

    connectKeyHeld,

    sourceId,

    hoverId,

    startConnect,

    releaseConnect,

  } = useConnectDraft();

  const { getNode } = useReactFlow();

  const isConnectTarget =

    hoverId === id && sourceId !== null && sourceId !== id;

  const isConnectSource = sourceId === id;

  const hasNested = nodeHasNestedChildren(graph.nodes, id);
  const isFocusParent = nodeData.isFocusParent === true;
  const isDescendantDimmed = nodeData.isDescendantDimmed === true;

  const parentNode = nodeData.parentId
    ? graph.nodes.find((n) => n.id === nodeData.parentId)
    : undefined;

  const baseW =
    (typeof width === "number" ? width : undefined) ??
    nodeData.width ??
    PLANNING_NODE_WIDTH;
  const baseH =
    (typeof height === "number" ? height : undefined) ??
    nodeData.height ??
    PLANNING_NODE_HEIGHT;
  const w = liveSize?.width ?? baseW;
  const h = liveSize?.height ?? baseH;



  return (

    <div

      className={`planning-node${showSelected ? " planning-node--selected" : ""}${isConnectTarget ? " planning-node--connect-target" : ""}${isConnectSource ? " planning-node--connect-source" : ""}${hasNested ? " planning-node--has-nested" : ""}${isFocusParent ? " planning-node--focus-parent" : ""}${isDescendantDimmed ? " planning-node--descendant-dim" : ""}${liveSize ? " planning-node--resizing" : ""}`}

      style={{
        width: w,
        height: h,
        position: "relative",
        ["--node-accent" as string]: color,
      }}

      onClick={(e) => {
        if (connectKeyHeld || sourceId) {
          return;
        }
        e.stopPropagation();
        selectNode(id);
        selectEdge(null);
      }}

      onPointerDown={(e) => {
        if (!connectKeyHeld && !sourceId && e.button === 0) {
          e.stopPropagation();
          selectNode(id);
          selectEdge(null);
        }

        if (!connectKeyHeld || e.shiftKey || e.button !== 0) {

          return;

        }

        e.stopPropagation();

        e.preventDefault();

        const node = getNode(id);

        const anchor = node ? getFlowNodeCenter(node) : { x: 0, y: 0 };

        startConnect(id, anchor, e);

      }}

      onPointerUp={(e) => {

        if (!sourceId || sourceId === id || e.button !== 0) {

          return;

        }

        e.stopPropagation();

        releaseConnect(id, e.nativeEvent);

      }}

    >

      <NodeConnectionHandles />

      <header className="planning-node__header">
        <NodeTypeMenu
          nodeId={id}
          currentType={nodeData.planningType}
          currentCustomTypeId={nodeData.customTypeId}
          typeLabel={typeLabel}
          borderColor={color}
          className="planning-node__type-menu"
        />
      </header>

      <div className="planning-node__body">
      <InlineEditable
        as="strong"
        className="planning-node__title"
        value={nodeData.title}
        editOnClick={false}
        onSelect={() => {
          selectNode(id);
          selectEdge(null);
        }}
        onCommit={(title) => updateNodeData(id, { title })}
      />

      {parentNode ? (
        <span className="planning-node__folder">
          on {parentNode.data.title}
        </span>
      ) : null}

      <div className="planning-node__desc-block nodrag nopan">
        <InlineEditable
          className="planning-node__desc"
          placeholder="description"
          value={nodeData.description ?? ""}
          editOnClick
          clickToEditDelay={0}
          multiline
          enterCommits
          onSelect={() => {
            selectNode(id);
            selectEdge(null);
          }}
          onCommit={(description) => updateNodeData(id, { description })}
        />
      </div>
      </div>

      <NodeCornerResizer
        nodeId={id}
        minWidth={PLANNING_NODE_MIN_WIDTH}
        minHeight={PLANNING_NODE_MIN_HEIGHT}
        onSizing={(nextWidth, nextHeight) =>
          setLiveSize({ width: nextWidth, height: nextHeight })
        }
        onSizeCommit={(nextWidth, nextHeight) => {
          dispatch({
            type: "update_node_layout",
            id,
            data: { width: nextWidth, height: nextHeight },
          });
          setLiveSize(null);
        }}
      />

    </div>

  );

}

