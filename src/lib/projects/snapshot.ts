import type { ChartState } from "../types";
import type { ProjectManifestEntry, Snapshot, SnapshotV2 } from "./types";
import { isSnapshotV1, isSnapshotV2, isValidChartState } from "./validators";
import { normalizeChartState } from "./normalize";
import { downloadBlob, slugify } from "./file-io";

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
  const snap = JSON.parse(text) as Snapshot;
  if (isSnapshotV2(snap)) return importV2(snap);
  if (isSnapshotV1(snap)) return importV1(snap);
  throw new Error("Invalid snapshot file");
}

function importV2(snap: SnapshotV2): {
  name: string;
  createdAt: number;
  state: ChartState;
} {
  if (!isValidChartState(snap.state)) throw new Error("Invalid snapshot file");
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

function importV1(snap: { guests: unknown[]; tables: unknown[] }): {
  name: string;
  createdAt: number;
  state: ChartState;
} {
  const state: ChartState = {
    guests: snap.guests as ChartState["guests"],
    tables: snap.tables as ChartState["tables"],
  };
  if (!isValidChartState(state)) throw new Error("Invalid snapshot file");
  return {
    name: defaultImportName(),
    createdAt: Date.now(),
    state: normalizeChartState(state),
  };
}

function defaultImportName(): string {
  const date = new Date().toLocaleDateString();
  return `Imported Chart (${date})`;
}
