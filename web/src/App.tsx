import { GraphCanvas } from "./components/canvas/GraphCanvas";
import { ProjectNameHeader } from "./components/header/ProjectNameHeader";
import { SelectionInspector } from "./components/inspector/SelectionInspector";
import { PaletteDock } from "./components/palette/PaletteDock";
import { GraphToolbar } from "./components/toolbar/GraphToolbar";
import { GraphCanvasCaptureProvider } from "./context/GraphCanvasCaptureContext";
import { GraphStoreProvider } from "./store/graphStore";
import { PaletteUiProvider } from "./store/paletteUiStore";
import "./App.css";

export default function App() {
  return (
    <GraphStoreProvider>
      <PaletteUiProvider>
      <GraphCanvasCaptureProvider>
      <div className="app">
        <header className="app__header">
          <div className="app__header-row">
            <div className="app__brand">
              <ProjectNameHeader />
              <p className="app__product">Agent Visual Tool</p>
              <p className="app__tagline">
                Offline planning graph for bootstrapping agentic workspaces
              </p>
            </div>
            <GraphToolbar />
          </div>
        </header>
        <div className="editor">
          <PaletteDock />
          <GraphCanvas />
          <SelectionInspector />
        </div>
      </div>
      </GraphCanvasCaptureProvider>
      </PaletteUiProvider>
    </GraphStoreProvider>
  );
}
