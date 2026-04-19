import type { TableShape } from "./types";

export const SHAPE_DEFAULTS = {
  round: { capacity: 8, minCapacity: 2, maxCapacity: 12 },
  rectangle: { capacity: 8, minCapacity: 4, maxCapacity: 20 },
  sweetheart: { capacity: 2, minCapacity: 2, maxCapacity: 2 },
  row: { capacity: 8, minCapacity: 1, maxCapacity: 20 },
} as const;

export const TABLE_SHAPES: TableShape[] = [
  "round",
  "rectangle",
  "sweetheart",
  "row",
];

export const TABLE_SHAPE_LABELS: Record<TableShape, string> = {
  round: "Round Table",
  rectangle: "Rectangle Table",
  sweetheart: "Sweetheart Table",
  row: "Ceremony Row",
};

export function canChangeCapacity(shape: TableShape): boolean {
  return shape !== "sweetheart";
}

export function clampCapacity(shape: TableShape, desired: number): number {
  const { minCapacity, maxCapacity } = SHAPE_DEFAULTS[shape];
  return Math.max(minCapacity, Math.min(maxCapacity, desired));
}
