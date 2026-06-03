import { useRef, useState } from "react";
import { useGraphCanvasCaptureRef } from "../../context/GraphCanvasCaptureContext";
import {
  captureGraphViewPng,
  graphCanvasPngFileName,
} from "../../lib/captureGraphView";
import { isLikelyGraphFile, readFileAsText } from "../../lib/fileIO";
import { buildExportPackage } from "../../export";
import {
  renderSingleMarkdownBrief,
  singleMarkdownFileName,
} from "../../export/singleMarkdown";
import { createPlanningPackageZip } from "../../export/zipExport";
import { downloadBlob, downloadTextFile } from "../../lib/fileIO";
import { useGraphStore } from "../../store/graphStore";

export function GraphToolbar() {
  const {
    graph,
    editorConfig,
    saveGraphToFile,
    loadGraphFromJson,
    reportLoadError,
    loadError,
    clearLoadError,
    loadSampleGraph,
    newBlankGraph,
  } = useGraphStore();
  const canvasCaptureRef = useGraphCanvasCaptureRef();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [capturingPng, setCapturingPng] = useState(false);

  const handleSave = () => {
    clearLoadError();
    setExportStatus(null);
    saveGraphToFile();
  };

  const handleValidateExport = () => {
    clearLoadError();
    const files = buildExportPackage(graph, editorConfig);
    const markdownCount = files.size - 1;
    setExportStatus(
      `Export ready: ${markdownCount} markdown file(s) + graph.json + bootstrap prompt. Or use Export brief (.md) for one file.`,
    );
  };

  const handleExportBriefMd = () => {
    clearLoadError();
    setExportStatus(null);
    const content = renderSingleMarkdownBrief(graph, editorConfig);
    downloadTextFile(singleMarkdownFileName(graph), content, "text/markdown");
    setExportStatus(`Downloaded ${singleMarkdownFileName(graph)} (single brief).`);
  };

  const handleSaveViewPng = async () => {
    clearLoadError();
    setExportStatus(null);
    const root = canvasCaptureRef.current;
    if (!root) {
      reportLoadError("Canvas is not ready. Try again in a moment.");
      return;
    }
    setCapturingPng(true);
    try {
      const blob = await captureGraphViewPng(root);
      const filename = graphCanvasPngFileName(graph);
      downloadBlob(filename, blob);
      setExportStatus(`Downloaded ${filename} (current canvas view).`);
    } catch {
      reportLoadError("Could not capture the graph view as PNG.");
    } finally {
      setCapturingPng(false);
    }
  };

  const handleExportZip = async () => {
    clearLoadError();
    setExportStatus(null);
    setExporting(true);
    try {
      const { blob, filename, fileCount } = await createPlanningPackageZip(
        graph,
        editorConfig,
      );
      downloadBlob(filename, blob);
      setExportStatus(`Downloaded ${filename} (${fileCount} files).`);
    } catch {
      reportLoadError("ZIP export failed. Try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleLoadClick = () => {
    clearLoadError();
    setExportStatus(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!isLikelyGraphFile(file)) {
      reportLoadError("Please choose a .json or .graph.json file.");
      return;
    }
    try {
      const text = await readFileAsText(file);
      loadGraphFromJson(text);
    } catch {
      reportLoadError("Could not read the selected file.");
    }
  };

  return (
    <div className="toolbar">
      <div className="toolbar__actions">
        <button
          type="button"
          className="btn"
          onClick={() => {
            clearLoadError();
            setExportStatus(null);
            loadSampleGraph();
          }}
        >
          Sample
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            clearLoadError();
            setExportStatus(null);
            newBlankGraph();
          }}
        >
          New
        </button>
        <button type="button" className="btn" onClick={handleSave}>
          Save graph
        </button>
        <button
          type="button"
          className="btn"
          onClick={handleSaveViewPng}
          disabled={capturingPng}
        >
          {capturingPng ? "Capturing…" : "Save view (.png)"}
        </button>
        <button type="button" className="btn" onClick={handleLoadClick}>
          Load graph
        </button>
        <button type="button" className="btn" onClick={handleValidateExport}>
          Check export
        </button>
        <button type="button" className="btn" onClick={handleExportBriefMd}>
          Export brief (.md)
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleExportZip}
          disabled={exporting}
        >
          {exporting ? "Exporting…" : "Export ZIP"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.graph.json,application/json"
          className="toolbar__file-input"
          onChange={handleFileChange}
        />
      </div>
      <p className="toolbar__hint">
        Graph, brief, ZIP, and PNG view filenames follow the project name at the top.
      </p>
      {exportStatus ? (
        <p className="toolbar__status">{exportStatus}</p>
      ) : null}
      {loadError ? (
        <p className="toolbar__error" role="alert">
          {loadError}
        </p>
      ) : null}
    </div>
  );
}
