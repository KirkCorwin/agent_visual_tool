import { useState } from "react";
import { useGraphStore } from "../../store/graphStore";

const WELCOME_DISMISSED_KEY = "agent-visual-tool-welcome-dismissed";

export function CanvasEmptyState() {
  const { graph, loadSampleGraph } = useGraphStore();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(WELCOME_DISMISSED_KEY) === "1",
  );
  const isSparse =
    graph.nodes.length <= 1 && graph.edges.length === 0;

  if (!isSparse || dismissed) {
    return null;
  }

  const dismiss = () => {
    sessionStorage.setItem(WELCOME_DISMISSED_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="canvas-empty">
      <button
        type="button"
        className="canvas-empty__close"
        onClick={dismiss}
        aria-label="Close welcome panel"
      >
        ×
      </button>
      <h3>Start your architecture graph</h3>
      <p>
        Add nodes from the left palette, connect handles on the canvas, then
        export a ZIP package for AI agents.
      </p>
      <ol className="canvas-empty__steps">
        <li>Add a <strong>Folder</strong> from the palette; drop nodes inside it</li>
        <li>Hold <strong>C</strong>, click source → release on target (chain many links)</li>
        <li><strong>Shift+click</strong> to multi-select</li>
        <li><strong>Double-click</strong> titles or link labels to rename</li>
        <li>Use <strong>Export ZIP</strong> when ready</li>
      </ol>
      <div className="canvas-empty__actions">
        <button type="button" className="btn btn--primary" onClick={loadSampleGraph}>
          Load sample graph
        </button>
        <button type="button" className="btn" onClick={dismiss}>
          Start blank
        </button>
      </div>
    </div>
  );
}
