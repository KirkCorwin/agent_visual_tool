import {
  CUSTOM_EDGE_OPTION,
  getEdgeTypeMenuValue,
  isCustomEdge,
} from "../../lib/edgeDisplay";
import { PLANNING_NODE_TYPES } from "../../lib/planningNodeTypes";
import { EDGE_TYPES, type EdgeType, type NodeType } from "../../graph/types";
import { NODE_TYPE_LABELS, resolveNodeTypeLabel } from "../canvas/nodeStyles";
import { useGraphStore } from "../../store/graphStore";

export function SelectionInspector() {
  const {
    selectedNode,
    selectedEdge,
    selection,
    updateNodeData,
    setNodeType,
    updateSelectedEdge,
    deleteSelected,
    defaultEdgeType,
    setDefaultEdgeType,
    warnings,
    graph,
  } = useGraphStore();

  return (
    <aside className="inspector">
      <h2 className="sidebar__title">Inspector</h2>

      <section className="inspector__section">
        <label className="field">
          <span className="field__label">New connection type</span>
          <select
            value={defaultEdgeType}
            onChange={(e) => setDefaultEdgeType(e.target.value as EdgeType)}
          >
            {EDGE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <p className="hint">Hold C, then click nodes to link. Shift+click multi-selects.</p>
      </section>

      {!selection ? (
        <p className="inspector__empty">Select a node or edge to edit.</p>
      ) : null}

      {selectedNode ? (
        <section className="inspector__section">
          <h3 className="inspector__heading">
            {resolveNodeTypeLabel(graph, selectedNode)}
          </h3>
          {selectedNode.type !== "folder" ? (
            <label className="field">
              <span className="field__label">Object type</span>
              <select
                value={selectedNode.type}
                onChange={(e) =>
                  setNodeType(selectedNode.id, e.target.value as NodeType)
                }
              >
                {PLANNING_NODE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {NODE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="field">
            <span className="field__label">Title</span>
            <input
              value={selectedNode.data.title}
              onChange={(e) =>
                updateNodeData(selectedNode.id, { title: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span className="field__label">Description</span>
            <textarea
              rows={4}
              value={selectedNode.data.description ?? ""}
              onChange={(e) =>
                updateNodeData(selectedNode.id, {
                  description: e.target.value || undefined,
                })
              }
            />
          </label>
          <label className="field">
            <span className="field__label">Width (px)</span>
            <input
              type="number"
              min={selectedNode.type === "folder" ? 160 : 160}
              value={
                selectedNode.data.width ??
                (selectedNode.type === "folder" ? 300 : 180)
              }
              onChange={(e) =>
                updateNodeData(selectedNode.id, {
                  width: Number(e.target.value) || (selectedNode.type === "folder" ? 300 : 180),
                })
              }
            />
          </label>
          <label className="field">
            <span className="field__label">Height (px)</span>
            <input
              type="number"
              min={selectedNode.type === "folder" ? 120 : 72}
              value={
                selectedNode.data.height ??
                (selectedNode.type === "folder" ? 200 : 88)
              }
              onChange={(e) =>
                updateNodeData(selectedNode.id, {
                  height: Number(e.target.value) || (selectedNode.type === "folder" ? 200 : 88),
                })
              }
            />
          </label>
          <p className="hint">
            Drag the corner grip on the canvas to resize.
          </p>
          {selectedNode.parentId ? (
            <p className="hint">
              Stacked on:{" "}
              {graph.nodes.find((n) => n.id === selectedNode.parentId)?.data
                .title ?? selectedNode.parentId}
            </p>
          ) : null}
          {selectedNode.type === "agent" ? (
            <label className="field">
              <span className="field__label">Role</span>
              <input
                value={selectedNode.data.role ?? ""}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    role: e.target.value || undefined,
                  })
                }
              />
            </label>
          ) : null}
          <label className="field">
            <span className="field__label">Status</span>
            <select
              value={selectedNode.data.status ?? ""}
              onChange={(e) =>
                updateNodeData(selectedNode.id, {
                  status:
                    (e.target.value as
                      | "draft"
                      | "active"
                      | "done"
                      | "blocked"
                      | "") || undefined,
                })
              }
            >
              <option value="">—</option>
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="done">done</option>
              <option value="blocked">blocked</option>
            </select>
          </label>
        </section>
      ) : null}

      {selectedEdge ? (
        <section className="inspector__section">
          <h3 className="inspector__heading">Edge</h3>
          <label className="field">
            <span className="field__label">Type</span>
            <select
              value={getEdgeTypeMenuValue(selectedEdge)}
              onChange={(e) => {
                const value = e.target.value;
                if (value === CUSTOM_EDGE_OPTION) {
                  updateSelectedEdge({ isCustom: true });
                } else {
                  updateSelectedEdge({
                    edgeType: value as EdgeType,
                    isCustom: false,
                  });
                }
              }}
            >
              {EDGE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
              <option value={CUSTOM_EDGE_OPTION}>Custom</option>
            </select>
          </label>
          {isCustomEdge(selectedEdge) ? (
            <label className="field">
              <span className="field__label">Custom relation</span>
              <input
                value={selectedEdge.data?.label ?? ""}
                onChange={(e) =>
                  updateSelectedEdge({ label: e.target.value })
                }
              />
            </label>
          ) : null}
        </section>
      ) : null}

      {selection ? (
        <button type="button" className="btn btn--danger" onClick={deleteSelected}>
          Delete selected
        </button>
      ) : null}

      <section className="inspector__section inspector__meta">
        <p>
          {graph.nodes.length} nodes · {graph.edges.length} edges
        </p>
        {warnings.length > 0 ? (
          <ul className="warnings">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
      </section>
    </aside>
  );
}
