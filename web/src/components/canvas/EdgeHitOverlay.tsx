import { useCallback, useMemo } from "react";
import { useStore, ViewportPortal } from "@xyflow/react";
import { getEdgePosition } from "@xyflow/system";
import type { PlanningEdgeFlowData } from "../../graph/reactFlowAdapter";
import { isImplicitEdge } from "../../graph/implicitEdges";
import {
  computeEdgeBundleLayouts,
  DEFAULT_EDGE_CURVATURE,
} from "../../lib/edgeBundleLayout";
import { resolveEdgePath } from "../../lib/edgePath";
import { EDGE_HIT_OVERLAY_Z_INDEX } from "../../lib/overlayZIndex";
import { useGraphStore } from "../../store/graphStore";

const EDGE_HIT_WIDTH = 28;

type EdgeHitOverlayProps = {
  disabled?: boolean;
};

type HitPath = {
  id: string;
  d: string;
};

export function EdgeHitOverlay({ disabled = false }: EdgeHitOverlayProps) {
  const { graph, selectEdge, selectNode } = useGraphStore();

  const bundleLayouts = useMemo(
    () =>
      computeEdgeBundleLayouts(
        graph.edges.filter((edge) => !isImplicitEdge(edge)),
      ),
    [graph.edges],
  );

  const hitPaths = useStore(
    useCallback(
      (store) => {
        const paths: HitPath[] = [];
        const edgeFollowsLabel = graph.settings?.edgeFollowsLabel === true;

        for (const edge of graph.edges) {
          if (isImplicitEdge(edge)) {
            continue;
          }

          const rfEdge = store.edgeLookup.get(edge.id);
          if (!rfEdge) {
            continue;
          }

          const sourceNode = store.nodeLookup.get(rfEdge.source);
          const targetNode = store.nodeLookup.get(rfEdge.target);
          if (!sourceNode || !targetNode) {
            continue;
          }

          const position = getEdgePosition({
            id: edge.id,
            sourceNode,
            targetNode,
            sourceHandle: rfEdge.sourceHandle ?? null,
            targetHandle: rfEdge.targetHandle ?? null,
            connectionMode: store.connectionMode,
          });

          if (!position) {
            continue;
          }

          const flowData = rfEdge.data as PlanningEdgeFlowData | undefined;
          const bundle = bundleLayouts.get(edge.id);
          const { path } = resolveEdgePath({
            sourceX: position.sourceX,
            sourceY: position.sourceY,
            targetX: position.targetX,
            targetY: position.targetY,
            sourcePosition: position.sourcePosition,
            targetPosition: position.targetPosition,
            curvature: flowData?.curvature ?? bundle?.curvature ?? DEFAULT_EDGE_CURVATURE,
            labelDrag: edge.data?.labelDrag ?? flowData?.labelDrag,
            bundleLabelOffsetPx: flowData?.labelOffsetPx ?? bundle?.labelOffsetPx ?? 0,
            edgeFollowsLabel,
          });

          paths.push({ id: edge.id, d: path });
        }

        return paths;
      },
      [graph.edges, graph.settings?.edgeFollowsLabel, bundleLayouts],
    ),
  );

  if (disabled || hitPaths.length === 0) {
    return null;
  }

  const onHitClick = (edgeId: string, event: React.MouseEvent<SVGPathElement>) => {
    event.stopPropagation();
    selectNode(null);
    selectEdge(edgeId);
  };

  return (
    <ViewportPortal>
      <svg
        className="edge-hit-overlay"
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          overflow: "visible",
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: EDGE_HIT_OVERLAY_Z_INDEX,
        }}
      >
        {hitPaths.map(({ id, d }) => (
          <path
            key={id}
            d={d}
            fill="none"
            stroke="transparent"
            strokeWidth={EDGE_HIT_WIDTH}
            className="edge-hit-overlay__path nopan"
            onClick={(event) => onHitClick(id, event)}
            onPointerDown={(event) => event.stopPropagation()}
          />
        ))}
      </svg>
    </ViewportPortal>
  );
}
