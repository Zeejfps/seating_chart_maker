import type { ChartState } from "../types";
import { safeRead, safeWrite, safeRemove } from "../safe-storage";
import type { ManifestFile } from "./types";
import { isValidChartState, isValidManifest } from "./validators";
import { normalizeChartState } from "./normalize";

const NS = "seating-chart-v2:";
export const K_MANIFEST = `${NS}manifest`;
export const K_CURRENT = `${NS}currentProjectId`;
export const projectKey = (id: string) => `${NS}project:${id}`;
export const K_LEGACY = "seating-chart-v1";
export const K_LEGACY_BACKUP = "seating-chart-v1.backup";

export function readManifest(): ManifestFile | null {
  const parsed = parseJson(safeRead(K_MANIFEST));
  return isValidManifest(parsed) ? parsed : null;
}

export function writeManifest(m: ManifestFile): void {
  safeWrite(K_MANIFEST, JSON.stringify(m));
}

export function readProject(id: string): ChartState | null {
  return readChartState(projectKey(id));
}

export function writeProject(id: string, state: ChartState): void {
  safeWrite(projectKey(id), JSON.stringify(state));
}

export function deleteProjectKey(id: string): void {
  safeRemove(projectKey(id));
}

export function readCurrentProjectId(): string | null {
  const v = safeRead(K_CURRENT);
  return v && v.length > 0 ? v : null;
}

export function writeCurrentProjectId(id: string | null): void {
  if (id === null) safeRemove(K_CURRENT);
  else safeWrite(K_CURRENT, id);
}

export function readLegacyV1(): ChartState | null {
  return readChartState(K_LEGACY);
}

export function moveLegacyToBackup(): void {
  const raw = safeRead(K_LEGACY);
  if (raw === null) return;
  safeWrite(K_LEGACY_BACKUP, raw);
  safeRemove(K_LEGACY);
}

function readChartState(key: string): ChartState | null {
  const parsed = parseJson(safeRead(key));
  if (!isValidChartState(parsed)) return null;
  return normalizeChartState(parsed);
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
