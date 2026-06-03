import JSZip from "jszip";
import type { EditorConfig } from "../graph/editorConfig";
import { DEFAULT_EDITOR_CONFIG } from "../graph/editorConfig";
import type { PlanningGraph } from "../graph/types";
import { projectFileSlug } from "../lib/fileIO";
import { buildExportPackage } from "./buildPackage";

export const DEFAULT_PROJECT_TITLE = "Untitled project";
export const DEFAULT_ZIP_FILENAME = "planning-package.zip";

/** Zip uses the project slug only; default name keeps the planning-package label. */
export function packageZipFileName(graph: PlanningGraph): string {
  const title = graph.meta.name.trim();
  if (!title || title === DEFAULT_PROJECT_TITLE) {
    return DEFAULT_ZIP_FILENAME;
  }
  return `${projectFileSlug(title)}.zip`;
}

export async function createZipFromPackage(
  files: Map<string, string>,
): Promise<Blob> {
  const zip = new JSZip();
  for (const [path, content] of files) {
    zip.file(path, content);
  }
  return zip.generateAsync({ type: "blob" });
}

export async function createPlanningPackageZip(
  graph: PlanningGraph,
  editorConfig: EditorConfig = DEFAULT_EDITOR_CONFIG,
): Promise<{ blob: Blob; filename: string; fileCount: number }> {
  const files = buildExportPackage(graph, editorConfig);
  const blob = await createZipFromPackage(files);
  return {
    blob,
    filename: packageZipFileName(graph),
    fileCount: files.size,
  };
}
