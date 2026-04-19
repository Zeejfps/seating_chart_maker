import { describe, it, expect } from "vitest";
import {
  chairPositionsForCircle,
  chairPositionsForRectangle,
  chairPositionsForSweetheart,
  chairPositionsForRow,
  chairPositionsFor,
  getTableLayout,
} from "../../src/lib/table-geometry";
import type { Table } from "../../src/lib/types";

const makeTable = (overrides: Partial<Table>): Table => ({
  id: "t1",
  name: "Test",
  shape: "round",
  capacity: 8,
  x: 0,
  y: 0,
  rotation: 0,
  ...overrides,
});

describe("chairPositionsForCircle", () => {
  it("produces one chair per seat", () => {
    expect(chairPositionsForCircle(8)).toHaveLength(8);
  });

  it("places first chair at the top of the circle", () => {
    const [first] = chairPositionsForCircle(4);
    expect(first.x).toBeCloseTo(50);
    expect(first.y).toBeCloseTo(-8);
  });

  it("distributes chairs evenly around center (50,50)", () => {
    const chairs = chairPositionsForCircle(4);
    expect(
      chairs.map((c) => ({ x: Math.round(c.x), y: Math.round(c.y) })),
    ).toEqual([
      { x: 50, y: -8 },
      { x: 108, y: 50 },
      { x: 50, y: 108 },
      { x: -8, y: 50 },
    ]);
  });
});

describe("chairPositionsForRectangle", () => {
  it("splits seats between top and bottom rows", () => {
    const chairs = chairPositionsForRectangle(8);
    expect(chairs).toHaveLength(8);
    const topRow = chairs.slice(0, 4);
    const bottomRow = chairs.slice(4);
    expect(topRow.every((c) => c.y < 0)).toBe(true);
    expect(bottomRow.every((c) => c.y > 0)).toBe(true);
  });

  it("places an odd seat on the top row", () => {
    const chairs = chairPositionsForRectangle(5);
    const topCount = chairs.filter((c) => c.y < 0).length;
    expect(topCount).toBe(3);
  });
});

describe("chairPositionsForSweetheart", () => {
  it("always returns exactly 2 chairs", () => {
    expect(chairPositionsForSweetheart()).toHaveLength(2);
  });
});

describe("chairPositionsForRow", () => {
  it("produces one chair per capacity seat", () => {
    expect(chairPositionsForRow(6)).toHaveLength(6);
  });

  it("places all chairs on the same horizontal line", () => {
    const chairs = chairPositionsForRow(4);
    const ys = new Set(chairs.map((c) => c.y));
    expect(ys.size).toBe(1);
  });
});

describe("chairPositionsFor (dispatch)", () => {
  it("dispatches by shape", () => {
    expect(
      chairPositionsFor(makeTable({ shape: "round", capacity: 8 })),
    ).toHaveLength(8);
    expect(
      chairPositionsFor(makeTable({ shape: "rectangle", capacity: 6 })),
    ).toHaveLength(6);
    expect(
      chairPositionsFor(makeTable({ shape: "sweetheart", capacity: 2 })),
    ).toHaveLength(2);
    expect(
      chairPositionsFor(makeTable({ shape: "row", capacity: 10 })),
    ).toHaveLength(10);
  });
});

describe("getTableLayout", () => {
  it("circle layout: body fills hitbox, no rotation", () => {
    const layout = getTableLayout(makeTable({ shape: "round", rotation: 90 }));
    expect(layout.rotation).toBe(0);
    expect(layout.bodyWidth).toBe(layout.width);
    expect(layout.bodyHeight).toBe(layout.height);
    expect(layout.infoMode).toBe("inside-body");
  });

  it("row layout: body is inner, info is above body, rotation applies", () => {
    const layout = getTableLayout(
      makeTable({ shape: "row", capacity: 6, rotation: 90 }),
    );
    expect(layout.infoMode).toBe("above-body");
    expect(layout.bodyWidth).toBeLessThan(layout.width);
    expect(layout.rotation).toBe(90);
  });

  it("rectangle layout: body matches hitbox, rotation applies", () => {
    const layout = getTableLayout(
      makeTable({ shape: "rectangle", capacity: 10, rotation: 180 }),
    );
    expect(layout.bodyWidth).toBe(layout.width);
    expect(layout.bodyHeight).toBe(layout.height);
    expect(layout.rotation).toBe(180);
  });
});
