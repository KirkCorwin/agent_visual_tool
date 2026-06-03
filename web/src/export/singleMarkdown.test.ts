import { describe, expect, it } from "vitest";
import { createEmptyGraph, createNode } from "../graph/defaults";
import { renderSingleMarkdownBrief, singleMarkdownFileName } from "./singleMarkdown";

describe("renderSingleMarkdownBrief", () => {
  it("includes bootstrap, nodes, and connections", () => {
    const graph = createEmptyGraph("Demo");
    const a = createNode("project", { data: { title: "App" } });
    const b = createNode("task", { data: { title: "Ship" } });
    graph.nodes.push(a, b);
    graph.edges.push({
      id: "e1",
      type: "depends_on",
      source: b.id,
      target: a.id,
    });

    const md = renderSingleMarkdownBrief(graph);
    expect(md).toContain("Bootstrap: Demo");
    expect(md).toContain("## All nodes");
    expect(md).toContain("**App** (project)");
    expect(md).toContain("## Connections");
    expect(md).toContain("depends on");
    expect(md).toContain("**Ship**");
  });

  it("names brief file from project meta", () => {
    const graph = createEmptyGraph("Drawing App");
    expect(singleMarkdownFileName(graph)).toBe("drawing-app-brief.md");
  });
});
