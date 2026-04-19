import type { ChartState, Guest, Table } from "../types";
import type { ManifestFile, ProjectManifestEntry, SnapshotV2 } from "./types";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function isValidGuest(obj: unknown): obj is Guest {
  if (!isObject(obj)) return false;
  return (
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    (obj.tableId === null || typeof obj.tableId === "string")
  );
}

export function isValidTable(obj: unknown): obj is Table {
  if (!isObject(obj)) return false;
  return (
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    typeof obj.capacity === "number" &&
    obj.capacity > 0
  );
}

export function isValidChartState(obj: unknown): obj is ChartState {
  if (!isObject(obj)) return false;
  return Array.isArray(obj.guests) && Array.isArray(obj.tables);
}

function isValidManifestEntry(obj: unknown): obj is ProjectManifestEntry {
  if (!isObject(obj)) return false;
  return (
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    typeof obj.createdAt === "number" &&
    typeof obj.updatedAt === "number" &&
    typeof obj.guestCount === "number" &&
    typeof obj.tableCount === "number"
  );
}

export function isValidManifest(obj: unknown): obj is ManifestFile {
  if (!isObject(obj)) return false;
  if (obj.version !== 2) return false;
  if (!Array.isArray(obj.projects)) return false;
  return obj.projects.every(isValidManifestEntry);
}

export function isSnapshotV1(
  obj: unknown,
): obj is { version: 1; guests: unknown[]; tables: unknown[] } {
  if (!isObject(obj)) return false;
  return (
    obj.version === 1 && Array.isArray(obj.guests) && Array.isArray(obj.tables)
  );
}

export function isSnapshotV2(obj: unknown): obj is SnapshotV2 {
  if (!isObject(obj)) return false;
  return obj.version === 2 && isObject(obj.project) && isObject(obj.state);
}
