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
