import type { ChartState, Table } from "../types";
import {
  snapToGrid,
  gridStartPosition,
  TABLE_SPACING,
  GRID_COLS,
} from "../grid";
import { isValidGuest, isValidTable } from "./validators";

export function normalizeChartState(parsed: {
  guests: unknown[];
  tables: unknown[];
}): ChartState {
  const sanitized = sanitizeChartState(parsed);
  sanitized.tables = backfillTableFields(
    backfillTablePositions(sanitized.tables),
  );
  return sanitized;
}

function sanitizeChartState(state: {
  guests: unknown[];
  tables: unknown[];
}): ChartState {
  const tables = state.tables.filter(isValidTable);
  const tableIds = new Set(tables.map((t) => t.id));
  const guests = state.guests.filter(isValidGuest).map((g) => ({
    ...g,
    tableId: g.tableId && tableIds.has(g.tableId) ? g.tableId : null,
  }));
  return { guests, tables };
}

function backfillTablePositions(tables: Table[]): Table[] {
  if (tables.every((t) => t.x != null && t.y != null)) return tables;
  const { startX, startY } = gridStartPosition();
  return tables.map((t, i) => ({
    ...t,
    x: t.x ?? snapToGrid(startX + (i % GRID_COLS) * TABLE_SPACING),
    y: t.y ?? snapToGrid(startY + Math.floor(i / GRID_COLS) * TABLE_SPACING),
  }));
}

function backfillTableFields(tables: Table[]): Table[] {
  if (tables.every((t) => t.shape != null && t.rotation != null)) return tables;
  return tables.map((t) => {
    const raw = t as unknown as Record<string, unknown>;
    return {
      ...t,
      shape: raw.shape ?? "round",
      rotation: raw.rotation ?? 0,
    };
  }) as Table[];
}
