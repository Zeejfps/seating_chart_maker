import type { Table } from "./types";
import { getTables, getNextTableNum } from "./state.svelte";
import { findOpenSlot } from "./grid";

/** Create a new table with a unique ID, next sequential name, default capacity, and the next open grid position. */
export function buildNewTable(): Table {
  const occupied = new Set(getTables().map((t) => `${t.x},${t.y}`));
  const pos = findOpenSlot(occupied);
  return {
    id: crypto.randomUUID(),
    name: String(getNextTableNum()),
    capacity: 8,
    ...pos,
  };
}
