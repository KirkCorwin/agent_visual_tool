import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import {
  createEdge,
  createEmptyGraph,
  createNode,
} from "../graph/defaults";
import { BOOTSTRAP_PROMPT_PATH } from "./bootstrapPrompt";
import { buildExportPackage } from "./buildPackage";
import {
  createZipFromPackage,
  DEFAULT_ZIP_FILENAME,
  packageZipFileName,
} from "./zipExport";

function smallGraph() {
  const graph = createEmptyGraph("Package Test");
  const project = createNode("project", { data: { title: "Package Test" } });
  const task = createNode("task", { data: { title: "Do work" } });
  graph.nodes.push(project, task);
  graph.edges.push(createEdge("references", task.id, project.id));
  return graph;
}

describe("zipExport", () => {
  it("names zip from project title slug only", () => {
    expect(packageZipFileName(smallGraph())).toBe("package-test.zip");
  });

  it("uses planning-package.zip for default title", () => {
    expect(packageZipFileName(createEmptyGraph())).toBe(DEFAULT_ZIP_FILENAME);
  });

  it("archives every file from buildExportPackage", async () => {
    const files = buildExportPackage(smallGraph());
    const blob = await createZipFromPackage(files);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());

    for (const path of files.keys()) {
      const entry = zip.file(path);
      expect(entry, `missing ${path}`).toBeTruthy();
      const text = await entry!.async("string");
      expect(text).toBe(files.get(path));
    }

    expect(files.has(BOOTSTRAP_PROMPT_PATH)).toBe(true);
  });
});
