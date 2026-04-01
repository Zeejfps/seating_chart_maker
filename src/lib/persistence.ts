import type { ChartState, Guest, Snapshot, Table } from "./types";

const STORAGE_KEY = "seating-chart-v1";
const GRID_SNAP = 50;
const TABLE_SPACING = 150;

function backfillTablePositions(tables: Table[]): Table[] {
  return tables.map((t, i) => ({
    ...t,
    x: t.x ?? Math.round(((i % 10) * TABLE_SPACING + 100) / GRID_SNAP) * GRID_SNAP,
    y: t.y ?? Math.round((Math.floor(i / 10) * TABLE_SPACING + 100) / GRID_SNAP) * GRID_SNAP,
  }));
}

export function saveToLocalStorage(state: ChartState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

export function loadFromLocalStorage(): ChartState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isValidChartState(parsed)) return null;
    parsed.tables = backfillTablePositions(parsed.tables);
    return parsed;
  } catch {
    return null;
  }
}

export function exportSnapshot(state: ChartState): void {
  const snapshot: Snapshot = {
    version: 1,
    guests: state.guests,
    tables: state.tables,
  };
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, "seating-chart.json");
}

export async function importSnapshot(file: File): Promise<ChartState> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!isValidSnapshot(parsed)) {
    throw new Error("Invalid snapshot file");
  }
  return { guests: parsed.guests, tables: backfillTablePositions(parsed.tables) };
}

export function exportGuestListCsv(guests: Guest[], tables: Table[]): void {
  const tableMap = new Map<string, string>();
  for (const t of tables) {
    tableMap.set(t.id, t.name);
  }

  const lines = ["name,table"];
  for (const g of guests) {
    const tableName = g.tableId ? (tableMap.get(g.tableId) ?? "") : "";
    lines.push(
      `"${g.name.replace(/"/g, '""')}","${tableName.replace(/"/g, '""')}"`,
    );
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  downloadBlob(blob, "seating-chart.csv");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function isValidChartState(obj: unknown): obj is ChartState {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return Array.isArray(o.guests) && Array.isArray(o.tables);
}

function isValidSnapshot(obj: unknown): obj is Snapshot {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return o.version === 1 && Array.isArray(o.guests) && Array.isArray(o.tables);
}
