import { describe, expect, it } from "vitest";
import {
  builtinSortableId,
  normalizeBuiltinPaletteOrder,
  parseBuiltinSortableId,
} from "./builtinPaletteOrder";

describe("builtinPaletteOrder", () => {
  it("round-trips sortable ids", () => {
    expect(parseBuiltinSortableId(builtinSortableId("task"))).toBe("task");
  });

  it("merges missing types into normalized order", () => {
    const order = normalizeBuiltinPaletteOrder(["agent", "task"]);
    expect(order).toContain("project");
    expect(order.indexOf("agent")).toBeLessThan(order.indexOf("task"));
  });
});
