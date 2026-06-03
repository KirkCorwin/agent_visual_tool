import { describe, expect, it } from "vitest";

import { clampPaletteWidth } from "./paletteWidth";

describe("clampPaletteWidth", () => {
  it("clamps to min and max", () => {
    expect(clampPaletteWidth(100)).toBe(160);
    expect(clampPaletteWidth(600)).toBe(520);
    expect(clampPaletteWidth(240)).toBe(240);
  });
});
