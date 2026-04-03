import type { Table, TableShape } from "./types";
import { getTables, getNextTableNum } from "./state.svelte";
import { executeCommand } from "./command-history.svelte";
import { AddTableCommand } from "./commands";
import { findOpenSlot, snapToGrid } from "./grid";
import { SHAPE_DEFAULTS } from "./table-shapes";

/** Create and execute a command to add a new table. */
export function addTable(shape: TableShape = "round"): void {
  executeCommand(new AddTableCommand(buildNewTable(shape)));
}

/** Create and execute a command to add a new table at specific canvas coordinates. */
export function addTableAt(
  x: number,
  y: number,
  shape: TableShape = "round",
): void {
  const table: Table = {
    id: crypto.randomUUID(),
    name: String(getNextTableNum()),
    shape,
    capacity: SHAPE_DEFAULTS[shape].capacity,
    rotation: 0,
    x: snapToGrid(x),
    y: snapToGrid(y),
  };
  executeCommand(new AddTableCommand(table));
}

/** Create a new table with a unique ID, next sequential name, default capacity, and the next open grid position. */
export function buildNewTable(shape: TableShape = "round"): Table {
  const occupied = new Set(getTables().map((t) => `${t.x},${t.y}`));
  const pos = findOpenSlot(occupied);
  return {
    id: crypto.randomUUID(),
    name: String(getNextTableNum()),
    shape,
    capacity: SHAPE_DEFAULTS[shape].capacity,
    rotation: 0,
    ...pos,
  };
}
