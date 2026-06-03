import { GraphCanvas } from "./components/canvas/GraphCanvas";
import { ProjectNameHeader } from "./components/header/ProjectNameHeader";
import { SelectionInspector } from "./components/inspector/SelectionInspector";
import { NodePalette } from "./components/palette/NodePalette";
import { ResizablePaletteShell } from "./components/palette/ResizablePaletteShell";
import { GraphToolbar } from "./components/toolbar/GraphToolbar";
import { GraphCanvasCaptureProvider } from "./context/GraphCanvasCaptureContext";
import { GraphStoreProvider } from "./store/graphStore";
import "./App.css";

export default function App() {
  return (
    <GraphStoreProvider>
      <GraphCanvasCaptureProvider>
      <div className="app">
        <header className="app__header">
          <div className="app__header-row">
            <div className="app__brand">
              <p className="app__product">Agent Visual Tool</p>
              <ProjectNameHeader />
              <p className="app__tagline">
                Offline planning graph for bootstrapping agentic workspaces
              </p>
            </div>
            <GraphToolbar />
          </div>
        </header>
        <div className="editor">
          <ResizablePaletteShell>
            <NodePalette />
          </ResizablePaletteShell>
          <GraphCanvas />
          <SelectionInspector />
        </div>
      </div>
      </GraphCanvasCaptureProvider>
    </GraphStoreProvider>
  );
}
