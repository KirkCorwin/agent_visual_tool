import { useState } from "react";

import { type NodeProps, useReactFlow } from "@xyflow/react";

import { nodeHasNestedChildren } from "../../graph/nodeHierarchy";
import { getFlowNodeCenter } from "../../lib/nodeConnectAnchor";

import type { FolderFlowData } from "../../graph/reactFlowAdapter";

import { useGraphStore } from "../../store/graphStore";
import { useIsNodeSelected } from "../../store/useNodeSelected";

import { InlineEditable } from "../shared/InlineEditable";

import { useConnectDraft } from "./ConnectDraftContext";

import { NodeConnectionHandles } from "./NodeConnectionHandles";
import { NodeCornerResizer } from "./NodeCornerResizer";



export function FolderFlowNode({ data, selected, id, width, height }: NodeProps) {

  const nodeData = data as FolderFlowData;

  const { updateNodeData, dispatch, graph, selectNode, selectEdge } =
    useGraphStore();
  const isSelected = useIsNodeSelected(id);
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

  const baseW = (typeof width === "number" ? width : undefined) ?? nodeData.width;
  const baseH =
    (typeof height === "number" ? height : undefined) ?? nodeData.height;
  const w = liveSize?.width ?? baseW;
  const h = liveSize?.height ?? baseH;

  return (

    <div

      className={`folder-node${showSelected ? " folder-node--selected" : ""}${isConnectTarget ? " folder-node--connect-target" : ""}${isConnectSource ? " folder-node--connect-source" : ""}${hasNested ? " folder-node--has-nested" : ""}${liveSize ? " folder-node--resizing" : ""}`}

      style={{
        width: w,
        height: h,
        position: "relative",
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

        releaseConnect(null, e.nativeEvent);

      }}

    >

      <NodeConnectionHandles />

      <div className="folder-node__header">

        <span className="folder-node__badge">Folder</span>

        <InlineEditable
          as="strong"
          className="folder-node__title"
          value={nodeData.title}
          editOnClick={false}
          onSelect={() => {
            selectNode(id);
            selectEdge(null);
          }}
          onCommit={(title) => updateNodeData(id, { title })}
        />

      </div>

      <div className="folder-node__body">
      <InlineEditable
        className="folder-node__desc"
        placeholder="description"
        value={nodeData.description ?? ""}
        editOnClick={false}
        multiline
        onSelect={() => {
          selectNode(id);
          selectEdge(null);
        }}
        onCommit={(description) => updateNodeData(id, { description })}
      />
      </div>

      <p className="folder-node__hint">Drop nodes inside · links to folders supported</p>

      <NodeCornerResizer
        nodeId={id}
        minWidth={160}
        minHeight={120}
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

