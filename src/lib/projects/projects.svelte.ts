import type { ChartState } from "../types";
import { replaceAll, reset } from "../state.svelte";
import { clearHistory } from "../command-history.svelte";
import {
  deleteProjectKey,
  exportSnapshotFile,
  importSnapshotFile,
  readCurrentProjectId,
  readManifest,
  readProject,
  uniqueName,
  writeCurrentProjectId,
  writeManifest,
  writeProject,
} from "./project-persistence";
import type { ManifestFile, ProjectManifestEntry } from "./types";
import { runMigrationIfNeeded } from "./migration";

const DEFAULT_PROJECT_NAME = "Untitled";

let _manifest: ManifestFile = $state(newManifest([]));
let _currentProjectId: string | null = $state(null);

const _sortedProjects = $derived(
  [..._manifest.projects].sort((a, b) => b.updatedAt - a.updatedAt),
);

function newManifest(projects: ProjectManifestEntry[]): ManifestFile {
  return { version: 2, projects };
}

function commitManifest(projects: ProjectManifestEntry[]): void {
  _manifest = newManifest(projects);
  writeManifest(_manifest);
}

function existingNames(): string[] {
  return _manifest.projects.map((p) => p.name);
}

export function initProjects(): void {
  runMigrationIfNeeded();
  const m = readManifest();
  _manifest = m ?? newManifest([]);
  if (!m) writeManifest(_manifest);

  const saved = readCurrentProjectId();
  if (saved && _manifest.projects.some((p) => p.id === saved)) {
    try {
      enterProject(saved);
    } catch {
      _currentProjectId = null;
      writeCurrentProjectId(null);
    }
  } else if (saved) {
    writeCurrentProjectId(null);
    _currentProjectId = null;
  }
}

export function getProjects(): ProjectManifestEntry[] {
  return _sortedProjects;
}

export function getCurrentProjectId(): string | null {
  return _currentProjectId;
}

export function getCurrentEntry(): ProjectManifestEntry | null {
  if (!_currentProjectId) return null;
  return _manifest.projects.find((p) => p.id === _currentProjectId) ?? null;
}

export function enterProject(id: string): void {
  const state = readProject(id);
  if (!state) {
    commitManifest(_manifest.projects.filter((p) => p.id !== id));
    if (_currentProjectId === id) {
      _currentProjectId = null;
      writeCurrentProjectId(null);
    }
    throw new Error("Project data missing or corrupted");
  }
  clearHistory();
  replaceAll(state);
  _currentProjectId = id;
  writeCurrentProjectId(id);
}

export function leaveProject(): void {
  // Clear the active id BEFORE reset() so the trailing auto-save $effect
  // fired by emptying state can't overwrite the just-left project.
  _currentProjectId = null;
  writeCurrentProjectId(null);
  reset();
}

export function createProject(): string {
  const id = crypto.randomUUID();
  const now = Date.now();
  const entry: ProjectManifestEntry = {
    id,
    name: uniqueName(DEFAULT_PROJECT_NAME, existingNames()),
    createdAt: now,
    updatedAt: now,
    guestCount: 0,
    tableCount: 0,
  };
  writeProject(id, { guests: [], tables: [] });
  commitManifest([..._manifest.projects, entry]);
  enterProject(id);
  return id;
}

export function renameProject(id: string, rawName: string): void {
  const name = rawName.trim();
  if (!name) return;
  const entry = _manifest.projects.find((p) => p.id === id);
  if (!entry || entry.name === name) return;
  commitManifest(
    _manifest.projects.map((p) => (p.id === id ? { ...p, name } : p)),
  );
}

export function duplicateProject(id: string): string | null {
  const source = _manifest.projects.find((p) => p.id === id);
  if (!source) return null;
  const sourceState = readProject(id);
  if (!sourceState) return null;
  const cloned: ChartState = {
    guests: sourceState.guests.map((g) => ({ ...g })),
    tables: sourceState.tables.map((t) => ({ ...t })),
  };
  const newId = crypto.randomUUID();
  const now = Date.now();
  const entry: ProjectManifestEntry = {
    id: newId,
    name: uniqueName(`${source.name} (copy)`, existingNames()),
    createdAt: now,
    updatedAt: now,
    guestCount: cloned.guests.length,
    tableCount: cloned.tables.length,
  };
  writeProject(newId, cloned);
  commitManifest([..._manifest.projects, entry]);
  return newId;
}

export function deleteProject(id: string): void {
  if (_currentProjectId === id) {
    reset();
    _currentProjectId = null;
    writeCurrentProjectId(null);
  }
  commitManifest(_manifest.projects.filter((p) => p.id !== id));
  deleteProjectKey(id);
}

export async function importAsNewProject(file: File): Promise<string> {
  const { name, createdAt, state } = await importSnapshotFile(file);
  const id = crypto.randomUUID();
  const now = Date.now();
  const entry: ProjectManifestEntry = {
    id,
    name: uniqueName(name, existingNames()),
    createdAt,
    updatedAt: now,
    guestCount: state.guests.length,
    tableCount: state.tables.length,
  };
  writeProject(id, state);
  commitManifest([..._manifest.projects, entry]);
  return id;
}

export function exportProject(id: string): void {
  const entry = _manifest.projects.find((p) => p.id === id);
  if (!entry) return;
  const state = readProject(id);
  if (!state) return;
  exportSnapshotFile(entry, state);
}

export function saveCurrentProject(state: ChartState): void {
  if (!_currentProjectId) return;
  writeProject(_currentProjectId, state);
  const id = _currentProjectId;
  const now = Date.now();
  commitManifest(
    _manifest.projects.map((p) =>
      p.id === id
        ? {
            ...p,
            updatedAt: now,
            guestCount: state.guests.length,
            tableCount: state.tables.length,
          }
        : p,
    ),
  );
}
