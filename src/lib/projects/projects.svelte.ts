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
  writeCurrentProjectId,
  writeManifest,
  writeProject,
} from "./project-persistence";
import type { ManifestFile, ProjectManifestEntry } from "./types";
import { runMigrationIfNeeded } from "./migration";
import { uniqueName } from "./naming";

const DEFAULT_PROJECT_NAME = "Untitled";

let _manifest: ManifestFile = $state({ version: 2, projects: [] });
let _currentProjectId: string | null = $state(null);

const _sortedProjects = $derived(
  [..._manifest.projects].sort((a, b) => b.updatedAt - a.updatedAt),
);

const _currentEntry = $derived(
  _currentProjectId
    ? (_manifest.projects.find((p) => p.id === _currentProjectId) ?? null)
    : null,
);

function commitManifest(projects: ProjectManifestEntry[]): void {
  _manifest = { version: 2, projects };
  writeManifest(_manifest);
}

function projectNames(): string[] {
  return _manifest.projects.map((p) => p.name);
}

function namesExcluding(id: string): string[] {
  return _manifest.projects.filter((p) => p.id !== id).map((p) => p.name);
}

function addProject(
  state: ChartState,
  name: string,
  createdAt: number = Date.now(),
): string {
  const id = crypto.randomUUID();
  const entry: ProjectManifestEntry = {
    id,
    name: uniqueName(name, projectNames()),
    createdAt,
    updatedAt: Date.now(),
    guestCount: state.guests.length,
    tableCount: state.tables.length,
  };
  writeProject(id, state);
  commitManifest([..._manifest.projects, entry]);
  return id;
}

export function initProjects(): void {
  runMigrationIfNeeded();
  const m = readManifest();
  _manifest = m ?? { version: 2, projects: [] };
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
  return _currentEntry;
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
  const id = addProject({ guests: [], tables: [] }, DEFAULT_PROJECT_NAME);
  enterProject(id);
  return id;
}

export function renameProject(id: string, rawName: string): void {
  const name = rawName.trim();
  if (!name) return;
  const entry = _manifest.projects.find((p) => p.id === id);
  if (!entry || entry.name === name) return;
  const finalName = uniqueName(name, namesExcluding(id));
  const now = Date.now();
  commitManifest(
    _manifest.projects.map((p) =>
      p.id === id ? { ...p, name: finalName, updatedAt: now } : p,
    ),
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
  return addProject(cloned, `${source.name} (copy)`);
}

export function deleteProject(id: string): void {
  if (_currentProjectId === id) {
    // Mirror leaveProject: clear id before reset() so the trailing auto-save
    // can't re-write empty state into a project we're about to delete.
    _currentProjectId = null;
    writeCurrentProjectId(null);
    reset();
  }
  commitManifest(_manifest.projects.filter((p) => p.id !== id));
  deleteProjectKey(id);
}

export async function importAsNewProject(file: File): Promise<string> {
  const { name, createdAt, state } = await importSnapshotFile(file);
  return addProject(state, name, createdAt);
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
