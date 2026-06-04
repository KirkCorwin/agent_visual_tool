import { describe, expect, it, vi } from "vitest";

import { measureAnchorScreenRect } from "./useFixedAnchorRect";

describe("measureAnchorScreenRect", () => {
  it("returns null when anchor is missing", () => {
    expect(measureAnchorScreenRect(null)).toBeNull();
  });

  it("returns getBoundingClientRect for the anchor element", () => {
    const rect = {
      top: 10,
      left: 20,
      bottom: 30,
      right: 40,
      width: 20,
      height: 20,
      x: 20,
      y: 10,
      toJSON: () => ({}),
    } as DOMRect;

    const el = {
      getBoundingClientRect: vi.fn(() => rect),
    } as unknown as HTMLElement;

    expect(measureAnchorScreenRect(el)).toBe(rect);
    expect(el.getBoundingClientRect).toHaveBeenCalledOnce();
  });

  it("reflects updated screen coordinates after remeasure", () => {
    let top = 5;
    const el = {
      getBoundingClientRect: vi.fn(() => ({
        top,
        left: 0,
        bottom: top + 10,
        right: 10,
        width: 10,
        height: 10,
        x: 0,
        y: top,
        toJSON: () => ({}),
      })),
    } as unknown as HTMLElement;

    expect(measureAnchorScreenRect(el)?.top).toBe(5);
    top = 99;
    expect(measureAnchorScreenRect(el)?.top).toBe(99);
  });
});
