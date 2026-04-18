import type { TableShape } from "./types";

export const SHAPE_DEFAULTS = {
  round: { capacity: 8, minCapacity: 2, maxCapacity: 12 },
  rectangle: { capacity: 8, minCapacity: 4, maxCapacity: 20 },
  sweetheart: { capacity: 2, minCapacity: 2, maxCapacity: 2 },
  row: { capacity: 8, minCapacity: 1, maxCapacity: 20 },
} as const;

export const RECT_SEAT_SPACING = 30;
export const RECT_HEIGHT = 50;
export const RECT_MIN_WIDTH = 120;
export const RECT_CHAIR_OFFSET = 18;

export const SWEETHEART_WIDTH = 80;
export const SWEETHEART_HEIGHT = 50;

export const ROW_SEAT_SPACING = 30;
export const ROW_HEIGHT = 6;
export const ROW_PADDING = 10;
export const ROW_CHAIR_OFFSET = 14;
const ROW_CHAIR_SIZE = 12;
export const ROW_HITBOX_PAD_X = 6;
export const ROW_HITBOX_HEIGHT =
  (ROW_CHAIR_OFFSET + ROW_CHAIR_SIZE) * 2 + ROW_HEIGHT;

export function getRectWidth(capacity: number): number {
  const seatsPerSide = Math.ceil(capacity / 2);
  return Math.max(RECT_MIN_WIDTH, seatsPerSide * RECT_SEAT_SPACING);
}

export function getRowWidth(capacity: number): number {
  return capacity * ROW_SEAT_SPACING + ROW_PADDING;
}

export function canChangeCapacity(shape: TableShape): boolean {
  return shape !== "sweetheart";
}

export function clampCapacity(shape: TableShape, desired: number): number {
  const { minCapacity, maxCapacity } = SHAPE_DEFAULTS[shape];
  return Math.max(minCapacity, Math.min(maxCapacity, desired));
}
