import { describe, expect, it } from "vitest";

import { dropdownMenuPositionFromRect } from "./DropdownMenuPortal";

describe("dropdownMenuPositionFromRect", () => {
  it("places the menu below the anchor with gap and min width", () => {
    const rect = {
      top: 100,
      left: 50,
      bottom: 120,
      width: 24,
    };
    expect(dropdownMenuPositionFromRect(rect, 4, 144)).toEqual({
      top: 124,
      left: 50,
      minWidth: 144,
    });
  });

  it("uses anchor width when wider than min width", () => {
    const rect = { top: 0, left: 0, bottom: 40, width: 200 };
    expect(dropdownMenuPositionFromRect(rect, 0, 144).minWidth).toBe(200);
  });
});
