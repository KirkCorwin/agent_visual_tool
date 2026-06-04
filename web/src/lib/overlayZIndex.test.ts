import { describe, expect, it } from "vitest";

import {
  CANVAS_DROPDOWN_Z_INDEX,
  EDGE_HIT_OVERLAY_Z_INDEX,
  EDGE_LABEL_RENDERER_Z_INDEX,
} from "./overlayZIndex";

describe("overlay z-index bands", () => {
  it("orders hit overlay below label renderer below canvas dropdowns", () => {
    expect(EDGE_HIT_OVERLAY_Z_INDEX).toBeLessThan(EDGE_LABEL_RENDERER_Z_INDEX);
    expect(EDGE_LABEL_RENDERER_Z_INDEX).toBeLessThan(CANVAS_DROPDOWN_Z_INDEX);
  });
});
