import type { ChartState, Snapshot, Table } from "./types";
import {
  snapToGrid,
  gridStartPosition,
  TABLE_SPACING,
  GRID_COLS,
} from "./grid";

const STORAGE_KEY = "seating-chart-v1";

function backfillTablePositions(tables: Table[]): Table[] {
  const { startX, startY } = gridStartPosition();
  return tables.map((t, i) => ({
    ...t,
    x: t.x ?? snapToGrid(startX + (i % GRID_COLS) * TABLE_SPACING),
    y: t.y ?? snapToGrid(startY + Math.floor(i / GRID_COLS) * TABLE_SPACING),
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
  return {
    guests: parsed.guests,
    tables: backfillTablePositions(parsed.tables),
  };
}

/** Open a file picker dialog and return the selected file, or null if cancelled. */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
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
