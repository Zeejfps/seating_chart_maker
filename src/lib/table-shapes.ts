import type { TableShape } from "./types";

export const SHAPE_DEFAULTS = {
  round: { capacity: 8, minCapacity: 2, maxCapacity: 12 },
  rectangle: { capacity: 8, minCapacity: 4, maxCapacity: 20 },
  sweetheart: { capacity: 2, minCapacity: 2, maxCapacity: 2 },
} as const;

export const RECT_SEAT_SPACING = 30;
export const RECT_HEIGHT = 50;
export const RECT_MIN_WIDTH = 120;
export const RECT_CHAIR_OFFSET = 18;

export const SWEETHEART_WIDTH = 80;
export const SWEETHEART_HEIGHT = 50;

export function getRectWidth(capacity: number): number {
  const seatsPerSide = Math.ceil(capacity / 2);
  return Math.max(RECT_MIN_WIDTH, seatsPerSide * RECT_SEAT_SPACING);
}

export function canChangeCapacity(shape: TableShape): boolean {
  return shape !== "sweetheart";
}

export function clampCapacity(shape: TableShape, desired: number): number {
  const { minCapacity, maxCapacity } = SHAPE_DEFAULTS[shape];
  return Math.max(minCapacity, Math.min(maxCapacity, desired));
}
