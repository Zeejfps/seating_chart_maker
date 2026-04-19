import { describe, it, expect } from "vitest";
import { clampMenuToViewport } from "../../src/lib/context-menu-position";

describe("clampMenuToViewport", () => {
  it("returns desired position when menu fits in viewport", () => {
    expect(clampMenuToViewport(100, 100, 200, 150, 800, 600)).toEqual({
      x: 100,
      y: 100,
    });
  });

  it("clamps left/top to padding when desired is off-screen", () => {
    expect(clampMenuToViewport(-50, -50, 100, 100, 800, 600, 8)).toEqual({
      x: 8,
      y: 8,
    });
  });

  it("clamps right/bottom when menu would overflow", () => {
    expect(clampMenuToViewport(780, 580, 100, 100, 800, 600, 8)).toEqual({
      x: 692,
      y: 492,
    });
  });

  it("honors custom padding", () => {
    expect(clampMenuToViewport(-50, -50, 100, 100, 800, 600, 20)).toEqual({
      x: 20,
      y: 20,
    });
  });
});
