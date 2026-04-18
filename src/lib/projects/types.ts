import type { ChartState, Guest, Table } from "../types";

export interface ProjectManifestEntry {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  guestCount: number;
  tableCount: number;
}

export interface ManifestFile {
  version: 2;
  projects: ProjectManifestEntry[];
}

export interface SnapshotV1 {
  version: 1;
  guests: Guest[];
  tables: Table[];
}

export interface SnapshotV2 {
  version: 2;
  project: { name: string; createdAt: number };
  state: ChartState;
}

export type Snapshot = SnapshotV1 | SnapshotV2;
