import type { Table, TableShape } from "./types";
import { getTables, getNextTableNum } from "./state.svelte";
import { executeCommand } from "./command-history.svelte";
import { AddTableCommand } from "./commands";
import { CANVAS_W, CANVAS_H, findOpenSlot, snapToGrid } from "./grid";
import { SHAPE_DEFAULTS } from "./table-shapes";
import type { TableClipboardSnapshot } from "./clipboard.svelte";

function rowNameToIndex(name: string): number | null {
  if (!/^Row [A-Z]+$/.test(name)) return null;
  let n = 0;
  for (const c of name.slice(4)) n = n * 26 + (c.charCodeAt(0) - 64);
  return n;
}

function indexToLetters(n: number): string {
  let s = "";
  while (n > 0) {
    n -= 1;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

function getNextRowName(tables: Table[]): string {
  let max = 0;
  for (const t of tables) {
    if (t.shape !== "row") continue;
    const n = rowNameToIndex(t.name);
    if (n !== null && n > max) max = n;
  }
  return `Row ${indexToLetters(max + 1)}`;
}

function nameForShape(shape: TableShape, tables: Table[]): string {
  return shape === "row" ? getNextRowName(tables) : String(getNextTableNum());
}

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
    name: nameForShape(shape, getTables()),
    shape,
    capacity: SHAPE_DEFAULTS[shape].capacity,
    rotation: 0,
    x: snapToGrid(x),
    y: snapToGrid(y),
  };
  executeCommand(new AddTableCommand(table));
}

function nameForPaste(source: TableClipboardSnapshot, tables: Table[]): string {
  if (/^\d+$/.test(source.name)) return String(getNextTableNum());
  if (/^Row [A-Z]+$/.test(source.name)) return getNextRowName(tables);
  const taken = new Set(tables.map((t) => t.name));
  const base = `${source.name} (copy)`;
  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${source.name} (copy ${n})`;
    if (!taken.has(candidate)) return candidate;
  }
  return base;
}

/** Create and execute a command to paste a table from a clipboard snapshot, centered at the given canvas coordinates. */
export function pasteTableAt(
  source: TableClipboardSnapshot,
  x: number,
  y: number,
): void {
  const tables = getTables();
  const table: Table = {
    id: crypto.randomUUID(),
    name: nameForPaste(source, tables),
    shape: source.shape,
    capacity: source.capacity,
    rotation: source.rotation,
    x: Math.max(0, Math.min(CANVAS_W, snapToGrid(x))),
    y: Math.max(0, Math.min(CANVAS_H, snapToGrid(y))),
  };
  executeCommand(new AddTableCommand(table));
}

/** Create a new table with a unique ID, next sequential name, default capacity, and the next open grid position. */
export function buildNewTable(shape: TableShape = "round"): Table {
  const tables = getTables();
  const occupied = new Set(tables.map((t) => `${t.x},${t.y}`));
  const pos = findOpenSlot(occupied);
  return {
    id: crypto.randomUUID(),
    name: nameForShape(shape, tables),
    shape,
    capacity: SHAPE_DEFAULTS[shape].capacity,
    rotation: 0,
    ...pos,
  };
}
