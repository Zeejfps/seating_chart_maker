import { describe, it, expect } from "vitest";
import {
  snapToGrid,
  gridStartPosition,
  findOpenSlot,
  GRID_SNAP,
  CANVAS_W,
  CANVAS_H,
} from "../../src/lib/grid";

describe("snapToGrid", () => {
  it("snaps to nearest grid line", () => {
    expect(snapToGrid(0)).toBe(0);
    expect(snapToGrid(24)).toBe(0);
    expect(snapToGrid(25)).toBe(50);
    expect(snapToGrid(26)).toBe(50);
    expect(snapToGrid(74)).toBe(50);
    expect(snapToGrid(75)).toBe(100);
  });

  it("handles negative values", () => {
    // Math.round(-0.48) = 0, Math.round(-0.5) = 0 (rounds toward +Infinity)
    expect(snapToGrid(-24)).toBe(-0);
    expect(snapToGrid(-25)).toBe(-0);
    expect(snapToGrid(-26)).toBe(-50);
    expect(snapToGrid(-75)).toBe(-50);
    expect(snapToGrid(-76)).toBe(-100);
  });

  it("returns exact grid values unchanged", () => {
    expect(snapToGrid(GRID_SNAP)).toBe(GRID_SNAP);
    expect(snapToGrid(GRID_SNAP * 5)).toBe(GRID_SNAP * 5);
  });
});

describe("gridStartPosition", () => {
  it("returns a position centered on the canvas", () => {
    const { startX, startY } = gridStartPosition();
    expect(startX).toBeGreaterThan(0);
    expect(startX).toBeLessThan(CANVAS_W);
    expect(startY).toBeGreaterThan(0);
    expect(startY).toBeLessThan(CANVAS_H);
  });
});

describe("findOpenSlot", () => {
  it("returns the first slot when none are occupied", () => {
    const slot = findOpenSlot(new Set());
    const { startX, startY } = gridStartPosition();
    expect(slot.x).toBe(snapToGrid(startX));
    expect(slot.y).toBe(snapToGrid(startY));
  });

  it("skips occupied slots", () => {
    const { startX, startY } = gridStartPosition();
    const firstSlot = `${snapToGrid(startX)},${snapToGrid(startY)}`;
    const slot = findOpenSlot(new Set([firstSlot]));
    expect(`${slot.x},${slot.y}`).not.toBe(firstSlot);
  });
});
