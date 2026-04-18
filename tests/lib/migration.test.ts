import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  K_CURRENT,
  K_LEGACY,
  K_LEGACY_BACKUP,
  K_MANIFEST,
  projectKey,
  readCurrentProjectId,
  readManifest,
} from "../../src/lib/projects/project-persistence";
import { runMigrationIfNeeded } from "../../src/lib/projects/migration";

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  vi.stubGlobal("crypto", {
    randomUUID: () => "fixed-uuid",
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const validV1 = () =>
  JSON.stringify({
    guests: [
      { id: "g1", name: "Alice", tableId: "t1" },
      { id: "g2", name: "Bob", tableId: null },
    ],
    tables: [
      {
        id: "t1",
        name: "1",
        shape: "round",
        capacity: 8,
        rotation: 0,
        x: 0,
        y: 0,
      },
    ],
  });

describe("runMigrationIfNeeded", () => {
  it("migrates legacy v1 into a new project + manifest + currentId", () => {
    storage.set(K_LEGACY, validV1());
    runMigrationIfNeeded();

    const m = readManifest();
    expect(m).not.toBeNull();
    expect(m!.projects).toHaveLength(1);
    expect(m!.projects[0].name).toBe("My Seating Chart");
    expect(m!.projects[0].guestCount).toBe(2);
    expect(m!.projects[0].tableCount).toBe(1);
    expect(m!.projects[0].id).toBe("fixed-uuid");

    expect(readCurrentProjectId()).toBe("fixed-uuid");

    // Project key written
    expect(storage.has(projectKey("fixed-uuid"))).toBe(true);

    // Legacy key moved to backup (no longer at K_LEGACY)
    expect(storage.has(K_LEGACY)).toBe(false);
    expect(storage.get(K_LEGACY_BACKUP)).toBe(validV1());
  });

  it("is a no-op when a manifest already exists", () => {
    storage.set(K_MANIFEST, JSON.stringify({ version: 2, projects: [] }));
    storage.set(K_LEGACY, validV1());
    runMigrationIfNeeded();

    const m = readManifest();
    expect(m!.projects).toHaveLength(0);
    expect(storage.has(K_CURRENT)).toBe(false);
  });

  it("is a no-op when there is no legacy data", () => {
    runMigrationIfNeeded();
    expect(readManifest()).toBeNull();
    expect(storage.has(K_CURRENT)).toBe(false);
  });

  it("is a no-op when legacy data is corrupted", () => {
    storage.set(K_LEGACY, "not json");
    runMigrationIfNeeded();
    expect(readManifest()).toBeNull();
  });
});
