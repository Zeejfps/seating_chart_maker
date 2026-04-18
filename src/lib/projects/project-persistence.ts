import type { ChartState, Guest, Table } from "../types";
import {
  snapToGrid,
  gridStartPosition,
  TABLE_SPACING,
  GRID_COLS,
} from "../grid";
import type {
  ManifestFile,
  ProjectManifestEntry,
  Snapshot,
  SnapshotV2,
} from "./types";

const NS = "seating-chart-v2:";
export const K_MANIFEST = `${NS}manifest`;
export const K_CURRENT = `${NS}currentProjectId`;
export const projectKey = (id: string) => `${NS}project:${id}`;
export const K_LEGACY = "seating-chart-v1";

export function readManifest(): ManifestFile | null {
  try {
    const raw = localStorage.getItem(K_MANIFEST);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isValidManifest(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeManifest(m: ManifestFile): void {
  try {
    localStorage.setItem(K_MANIFEST, JSON.stringify(m));
  } catch {}
}

export function readProject(id: string): ChartState | null {
  return readChartState(projectKey(id));
}

export function writeProject(id: string, state: ChartState): void {
  try {
    localStorage.setItem(projectKey(id), JSON.stringify(state));
  } catch {}
}

export function deleteProjectKey(id: string): void {
  try {
    localStorage.removeItem(projectKey(id));
  } catch {}
}

export function readCurrentProjectId(): string | null {
  try {
    const v = localStorage.getItem(K_CURRENT);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function writeCurrentProjectId(id: string | null): void {
  try {
    if (id === null) localStorage.removeItem(K_CURRENT);
    else localStorage.setItem(K_CURRENT, id);
  } catch {}
}

export function readLegacyV1(): ChartState | null {
  return readChartState(K_LEGACY);
}

function readChartState(key: string): ChartState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isValidChartState(parsed)) return null;
    return normalizeChartState(parsed);
  } catch {
    return null;
  }
}

function normalizeChartState(parsed: {
  guests: unknown[];
  tables: unknown[];
}): ChartState {
  const sanitized = sanitizeChartState(parsed);
  sanitized.tables = backfillTableFields(
    backfillTablePositions(sanitized.tables),
  );
  return sanitized;
}

export function exportSnapshotFile(
  entry: ProjectManifestEntry,
  state: ChartState,
): void {
  const snapshot: SnapshotV2 = {
    version: 2,
    project: { name: entry.name, createdAt: entry.createdAt },
    state,
  };
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });
  const slug = slugify(entry.name) || "seating-chart";
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `${slug}-${date}.json`);
}

export async function importSnapshotFile(
  file: File,
): Promise<{ name: string; createdAt: number; state: ChartState }> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const snap = parsed as Snapshot;
  if (isSnapshotV2(snap)) {
    if (!isValidChartState(snap.state)) {
      throw new Error("Invalid snapshot file");
    }
    const name =
      typeof snap.project?.name === "string"
        ? snap.project.name.trim() || defaultImportName()
        : defaultImportName();
    const createdAt =
      typeof snap.project?.createdAt === "number"
        ? snap.project.createdAt
        : Date.now();
    return { name, createdAt, state: normalizeChartState(snap.state) };
  }
  if (isSnapshotV1(snap)) {
    const state: ChartState = { guests: snap.guests, tables: snap.tables };
    if (!isValidChartState(state)) throw new Error("Invalid snapshot file");
    return {
      name: defaultImportName(),
      createdAt: Date.now(),
      state: normalizeChartState(state),
    };
  }
  throw new Error("Invalid snapshot file");
}

export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.addEventListener("cancel", () => resolve(null));
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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function defaultImportName(): string {
  const date = new Date().toLocaleDateString();
  return `Imported Chart (${date})`;
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

function isValidGuest(obj: unknown): boolean {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    (o.tableId === null || typeof o.tableId === "string")
  );
}

function isValidTable(obj: unknown): boolean {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.capacity === "number" &&
    o.capacity > 0
  );
}

function sanitizeChartState(state: {
  guests: unknown[];
  tables: unknown[];
}): ChartState {
  const tables = state.tables.filter(isValidTable) as Table[];
  const tableIds = new Set(tables.map((t) => t.id));
  const guests = (state.guests.filter(isValidGuest) as Guest[]).map((g) => ({
    ...g,
    tableId: g.tableId && tableIds.has(g.tableId) ? g.tableId : null,
  }));
  return { guests, tables };
}

function isValidChartState(obj: unknown): obj is ChartState {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return Array.isArray(o.guests) && Array.isArray(o.tables);
}

function isValidManifest(obj: unknown): obj is ManifestFile {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  if (o.version !== 2) return false;
  if (!Array.isArray(o.projects)) return false;
  return o.projects.every(isValidManifestEntry);
}

function isValidManifestEntry(obj: unknown): obj is ProjectManifestEntry {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.createdAt === "number" &&
    typeof o.updatedAt === "number" &&
    typeof o.guestCount === "number" &&
    typeof o.tableCount === "number"
  );
}

function isSnapshotV1(obj: unknown): obj is Snapshot & { version: 1 } {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return o.version === 1 && Array.isArray(o.guests) && Array.isArray(o.tables);
}

function isSnapshotV2(obj: unknown): obj is SnapshotV2 {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    o.version === 2 &&
    typeof o.project === "object" &&
    o.project !== null &&
    typeof o.state === "object" &&
    o.state !== null
  );
}

export function uniqueName(base: string, existing: string[]): string {
  if (!existing.includes(base)) return base;
  let n = 2;
  while (existing.includes(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}
