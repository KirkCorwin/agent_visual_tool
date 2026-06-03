import { describe, expect, it } from "vitest";

import { createSampleGraph } from "../graph/sampleGraph";
import { graphCanvasPngFileName } from "./captureGraphView";

describe("graphCanvasPngFileName", () => {
  it("uses project slug and -canvas.png suffix", () => {
    const graph = createSampleGraph();
    graph.meta.name = "Drawing App";
    expect(graphCanvasPngFileName(graph)).toBe("drawing-app-canvas.png");
  });
});
