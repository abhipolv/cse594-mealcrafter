import { describe, expect, it } from "vitest";
import { cropStyle } from "./crop";

describe("cropStyle", () => {
  it("center-crops a landscape image without a box", () => {
    expect(cropStyle(1000, 500)).toEqual({ backgroundSize: "200% 100%", backgroundPosition: "50% 0%" });
  });

  it("zooms into the box and keeps the crop inside the image", () => {
    // 100x100 box at the top-left corner of a 1000x1000 image: 120px square at the edge.
    const s = cropStyle(1000, 1000, { x: 0, y: 0, w: 0.1, h: 0.1 });
    expect(s.backgroundSize).toBe("833.33% 833.33%");
    expect(s.backgroundPosition).toBe("0% 0%");
  });

  it("clamps a box at the far edge", () => {
    expect(cropStyle(1000, 1000, { x: 0.9, y: 0.9, w: 0.1, h: 0.1 }).backgroundPosition).toBe("100% 100%");
  });
});
