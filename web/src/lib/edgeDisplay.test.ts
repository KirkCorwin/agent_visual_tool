import { describe, expect, it } from "vitest";

import type { PlanningEdge } from "../graph/types";

import {
  getEdgeMinimalLetter,
  normalizeCustomEdgeLabel,
} from "./edgeDisplay";

function edge(partial: Partial<PlanningEdge> & Pick<PlanningEdge, "type">): PlanningEdge {
  return {
    id: "e1",
    source: "a",
    target: "b",
    type: partial.type,
    data: partial.data,
  };
}

describe("getEdgeMinimalLetter", () => {
  it("uses the first letter of the formatted edge type", () => {
    expect(getEdgeMinimalLetter(edge({ type: "depends_on" }))).toBe("D");
    expect(getEdgeMinimalLetter(edge({ type: "implements" }))).toBe("I");
  });

  it("uses the first letter of custom label text when set", () => {
    expect(
      getEdgeMinimalLetter(
        edge({
          type: "references",
          data: { isCustom: true, label: "owns pipeline" },
        }),
      ),
    ).toBe("O");
  });

  it("falls back to C for empty custom labels", () => {
    expect(
      getEdgeMinimalLetter(
        edge({ type: "references", data: { isCustom: true, label: "" } }),
      ),
    ).toBe("C");
  });
});

describe("normalizeCustomEdgeLabel", () => {
  it("trims and capitalizes the first character", () => {
    expect(normalizeCustomEdgeLabel("  owns pipeline  ")).toBe("Owns pipeline");
    expect(normalizeCustomEdgeLabel("depends")).toBe("Depends");
  });

  it("returns empty string for blank input", () => {
    expect(normalizeCustomEdgeLabel("   ")).toBe("");
  });
});
