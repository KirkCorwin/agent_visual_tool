import type { PlanningGraph } from "../graph/types";

const GRAPH_FILE_SUFFIX = ".graph.json";

/** Safe filesystem slug from a human-readable project name. */
export function projectFileSlug(name: string, fallback = "project"): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback
  );
}

export function graphFileName(graph: PlanningGraph): string {
  return `${projectFileSlug(graph.meta.name, "graph")}${GRAPH_FILE_SUFFIX}`;
}

const EDITOR_SETTINGS_SUFFIX = ".editor-settings.json";

export function editorSettingsFileName(graph?: PlanningGraph): string {
  const slug = graph
    ? projectFileSlug(graph.meta.name, "settings")
    : "agent-visual-tool";
  return `${slug}${EDITOR_SETTINGS_SUFFIX}`;
}

export function isLikelyEditorSettingsFile(file: File): boolean {
  return (
    file.name.endsWith(EDITOR_SETTINGS_SUFFIX) ||
    (file.type === "application/json" && file.name.includes("editor-settings"))
  );
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = "application/json",
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function readFileAsText(file: File): Promise<string> {
  return file.text();
}

export function isLikelyGraphFile(file: File): boolean {
  return (
    file.type === "application/json" ||
    file.name.endsWith(".json") ||
    file.name.endsWith(GRAPH_FILE_SUFFIX)
  );
}
