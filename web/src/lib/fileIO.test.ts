import { describe, expect, it } from "vitest";
import { createEmptyGraph } from "../graph/defaults";
import { graphFileName, isLikelyGraphFile, projectFileSlug } from "./fileIO";

describe("fileIO", () => {
  it("builds a safe filename from project name", () => {
    const graph = createEmptyGraph("My Cool Project!");
    expect(graphFileName(graph)).toBe("my-cool-project.graph.json");
  });

  it("falls back when name is only symbols", () => {
    const graph = createEmptyGraph("!!!");
    expect(graphFileName(graph)).toBe("graph.graph.json");
  });

  it("slugifies project names consistently", () => {
    expect(projectFileSlug("My Cool Project!")).toBe("my-cool-project");
    expect(projectFileSlug("   ")).toBe("project");
  });

  it("accepts json graph files", () => {
    const file = new File(["{}"], "plan.graph.json", {
      type: "application/json",
    });
    expect(isLikelyGraphFile(file)).toBe(true);
  });
});
