import type { Guest, Table, ChartState } from "./types";
import { findOpenSlot } from "./grid";

let _guests: Guest[] = $state([]);
let _tables: Table[] = $state([]);
let _dndActive: boolean = $state(false);

function isDndActive(): boolean {
  return _dndActive;
}

function setDndActive(active: boolean) {
  _dndActive = active;
}

function getGuests(): Guest[] {
  return _guests;
}

function getTables(): Table[] {
  return _tables;
}

function getUnassignedGuests(): Guest[] {
  return _guests.filter((g) => g.tableId === null);
}

function getAssignedGuests(): Guest[] {
  return _guests.filter((g) => g.tableId !== null);
}

function getGuestsByTable(): Map<string, Guest[]> {
  const map = new Map<string, Guest[]>();
  for (const t of _tables) {
    map.set(t.id, []);
  }
  for (const g of _guests) {
    if (g.tableId !== null) {
      const list = map.get(g.tableId);
      if (list) list.push(g);
    }
  }
  return map;
}

function updateGuest(id: string, patch: Partial<Guest>) {
  _guests = _guests.map((g) => (g.id === id ? { ...g, ...patch } : g));
}

function addGuest(guest: Guest) {
  _guests = [..._guests, guest];
}

function removeGuest(id: string) {
  _guests = _guests.filter((g) => g.id !== id);
}

function addTable(table: Table) {
  _tables = [..._tables, table];
}

function removeTable(id: string) {
  _tables = _tables.filter((t) => t.id !== id);
}

function updateTable(id: string, patch: Partial<Table>) {
  _tables = _tables.map((t) => (t.id === id ? { ...t, ...patch } : t));
}

function reorderGuests(orderedIds: string[]) {
  const idToIndex = new Map(orderedIds.map((id, i) => [id, i]));
  _guests = [..._guests].sort((a, b) => {
    const ai = idToIndex.get(a.id);
    const bi = idToIndex.get(b.id);
    if (ai !== undefined && bi !== undefined) return ai - bi;
    if (ai !== undefined) return -1;
    if (bi !== undefined) return 1;
    return 0;
  });
}

function getNextTableNum(): number {
  let max = 0;
  for (const t of _tables) {
    const n = parseInt(t.name, 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return max + 1;
}

function getNextTablePosition(): { x: number; y: number } {
  const occupied = new Set(_tables.map((t) => `${t.x},${t.y}`));
  return findOpenSlot(occupied);
}

function replaceAll(state: ChartState) {
  _guests = state.guests;
  _tables = state.tables;
}

function getState(): ChartState {
  return { guests: _guests, tables: _tables };
}

export {
  isDndActive,
  setDndActive,
  getGuests,
  getTables,
  getUnassignedGuests,
  getAssignedGuests,
  getGuestsByTable,
  updateGuest,
  addGuest,
  removeGuest,
  addTable,
  removeTable,
  updateTable,
  reorderGuests,
  replaceAll,
  getState,
  getNextTableNum,
  getNextTablePosition,
};
