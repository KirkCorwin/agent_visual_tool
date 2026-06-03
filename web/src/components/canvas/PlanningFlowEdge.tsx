import {

  BaseEdge,

  EdgeLabelRenderer,

  type EdgeProps,

} from "@xyflow/react";

import type { PlanningEdgeFlowData } from "../../graph/reactFlowAdapter";

import { PLANNING_EDGE_MARKER_END } from "../../graph/edgeMarkers";

import { DEFAULT_EDGE_CURVATURE } from "../../lib/edgeBundleLayout";

import { resolveEdgePath } from "../../lib/edgePath";

import { useGraphStore } from "../../store/graphStore";

import { EdgeLabelEditor } from "./EdgeLabelEditor";



export function PlanningFlowEdge({

  id,

  sourceX,

  sourceY,

  targetX,

  targetY,

  sourcePosition,

  targetPosition,

  data,

  markerEnd,

  style,

  interactionWidth,

}: EdgeProps) {

  const edgeData = data as PlanningEdgeFlowData | undefined;

  const { selection, graph } = useGraphStore();

  const graphEdge = graph.edges.find((e) => e.id === id);



  const curvature = edgeData?.curvature ?? DEFAULT_EDGE_CURVATURE;

  const labelOffsetPx = edgeData?.labelOffsetPx ?? 0;

  const bundleIndex = edgeData?.bundleIndex ?? 0;

  const labelDrag = graphEdge?.data?.labelDrag ?? edgeData?.labelDrag;



  const { path, labelX, labelY } = resolveEdgePath({

    sourceX,

    sourceY,

    targetX,

    targetY,

    sourcePosition,

    targetPosition,

    curvature,

    labelDrag,

    bundleLabelOffsetPx: labelOffsetPx,

    edgeFollowsLabel: graph.settings?.edgeFollowsLabel === true,

  });



  const isSelected = selection?.kind === "edge" && selection.id === id;

  return (

    <>

      <BaseEdge

        id={id}

        path={path}

        markerEnd={

          (markerEnd ?? PLANNING_EDGE_MARKER_END) as typeof markerEnd

        }

        interactionWidth={interactionWidth ?? 28}

        style={{
          stroke: isSelected ? "#b8bcc6" : "#9aa0a6",
          strokeWidth: isSelected ? 2.5 : 2,
          ...style,
        }}

      />

      <EdgeLabelRenderer>

        <EdgeLabelEditor

          edgeId={id}

          isSelected={isSelected}

          style={{

            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,

            zIndex: isSelected ? 1250 : 1100 + bundleIndex,

          }}

        />

      </EdgeLabelRenderer>

    </>

  );

}

