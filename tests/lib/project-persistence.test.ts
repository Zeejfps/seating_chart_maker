import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  K_CURRENT,
  K_LEGACY,
  K_LEGACY_BACKUP,
  K_MANIFEST,
  deleteProjectKey,
  exportSnapshotFile,
  importSnapshotFile,
  moveLegacyToBackup,
  projectKey,
  readCurrentProjectId,
  readLegacyV1,
  readManifest,
  readProject,
  writeCurrentProjectId,
  writeManifest,
  writeProject,
} from "../../src/lib/projects/project-persistence";
import type {
  ManifestFile,
  SnapshotV1,
  SnapshotV2,
} from "../../src/lib/projects/types";
import type { ChartState } from "../../src/lib/types";

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const sampleState = (): ChartState => ({
  guests: [{ id: "g1", name: "Alice", tableId: "t1" }],
  tables: [
    {
      id: "t1",
      name: "1",
      shape: "round",
      capacity: 8,
      rotation: 0,
      x: 100,
      y: 200,
    },
  ],
});

describe("manifest read/write", () => {
  it("round-trips a manifest", () => {
    const m: ManifestFile = {
      version: 2,
      projects: [
        {
          id: "p1",
          name: "Alpha",
          createdAt: 1,
          updatedAt: 2,
          guestCount: 3,
          tableCount: 4,
        },
      ],
    };
    writeManifest(m);
    expect(readManifest()).toEqual(m);
  });

  it("returns null when missing", () => {
    expect(readManifest()).toBeNull();
  });

  it("returns null when malformed", () => {
    storage.set(K_MANIFEST, "not json");
    expect(readManifest()).toBeNull();
  });

  it("rejects wrong version", () => {
    storage.set(K_MANIFEST, JSON.stringify({ version: 1, projects: [] }));
    expect(readManifest()).toBeNull();
  });
});

describe("project read/write", () => {
  it("round-trips a chart state with sanitization", () => {
    writeProject("p1", sampleState());
    const loaded = readProject("p1");
    expect(loaded).not.toBeNull();
    expect(loaded!.guests).toHaveLength(1);
    expect(loaded!.tables).toHaveLength(1);
    expect(loaded!.tables[0].shape).toBe("round");
  });

  it("returns null for missing project", () => {
    expect(readProject("nope")).toBeNull();
  });

  it("filters invalid guests and tables", () => {
    storage.set(
      projectKey("p1"),
      JSON.stringify({
        guests: [
          { id: "g1", name: "Alice", tableId: null },
          { id: 123, name: "Bad" },
          "not an object",
        ],
        tables: [
          { id: "t1", name: "1", capacity: 8, x: 0, y: 0 },
          { id: "t2", name: "Bad", capacity: -1, x: 0, y: 0 },
        ],
      }),
    );
    const loaded = readProject("p1");
    expect(loaded!.guests).toHaveLength(1);
    expect(loaded!.tables).toHaveLength(1);
  });

  it("backfills missing table shape/rotation", () => {
    storage.set(
      projectKey("p1"),
      JSON.stringify({
        guests: [],
        tables: [{ id: "t1", name: "1", capacity: 8, x: 0, y: 0 }],
      }),
    );
    const loaded = readProject("p1");
    expect(loaded!.tables[0].shape).toBe("round");
    expect(loaded!.tables[0].rotation).toBe(0);
  });

  it("nullifies guest tableId referencing nonexistent table", () => {
    storage.set(
      projectKey("p1"),
      JSON.stringify({
        guests: [{ id: "g1", name: "Alice", tableId: "nonexistent" }],
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
      }),
    );
    const loaded = readProject("p1");
    expect(loaded!.guests[0].tableId).toBeNull();
  });

  it("deleteProjectKey removes only the target", () => {
    writeProject("p1", sampleState());
    writeProject("p2", sampleState());
    deleteProjectKey("p1");
    expect(readProject("p1")).toBeNull();
    expect(readProject("p2")).not.toBeNull();
  });
});

describe("current project id", () => {
  it("round-trips", () => {
    writeCurrentProjectId("abc");
    expect(readCurrentProjectId()).toBe("abc");
  });

  it("writes null to remove", () => {
    writeCurrentProjectId("abc");
    writeCurrentProjectId(null);
    expect(readCurrentProjectId()).toBeNull();
    expect(storage.has(K_CURRENT)).toBe(false);
  });
});

describe("legacy v1 read", () => {
  it("reads a v1 payload with sanitization", () => {
    storage.set(
      K_LEGACY,
      JSON.stringify({
        guests: [{ id: "g1", name: "Alice", tableId: null }],
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
      }),
    );
    const state = readLegacyV1();
    expect(state).not.toBeNull();
    expect(state!.guests[0].name).toBe("Alice");
  });

  it("returns null when missing or invalid", () => {
    expect(readLegacyV1()).toBeNull();
    storage.set(K_LEGACY, "not json");
    expect(readLegacyV1()).toBeNull();
  });
});

describe("snapshot import", () => {
  function makeFile(content: string): File {
    return new File([content], "test.json", { type: "application/json" });
  }

  it("accepts v2 snapshot and preserves name + createdAt", async () => {
    const snap: SnapshotV2 = {
      version: 2,
      project: { name: "My Chart", createdAt: 42 },
      state: sampleState(),
    };
    const result = await importSnapshotFile(makeFile(JSON.stringify(snap)));
    expect(result.name).toBe("My Chart");
    expect(result.createdAt).toBe(42);
    expect(result.state.guests).toHaveLength(1);
  });

  it("accepts v1 snapshot and wraps with default name", async () => {
    const snap: SnapshotV1 = {
      version: 1,
      guests: [{ id: "g1", name: "Alice", tableId: null }],
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
    };
    const result = await importSnapshotFile(makeFile(JSON.stringify(snap)));
    expect(result.name).toMatch(/^Imported Chart \(/);
    expect(typeof result.createdAt).toBe("number");
    expect(result.state.guests).toHaveLength(1);
  });

  it("rejects unknown version", async () => {
    await expect(
      importSnapshotFile(
        makeFile(JSON.stringify({ version: 3, guests: [], tables: [] })),
      ),
    ).rejects.toThrow();
  });

  it("rejects malformed JSON", async () => {
    await expect(importSnapshotFile(makeFile("not json"))).rejects.toThrow();
  });

  it("rejects v2 with invalid state shape", async () => {
    await expect(
      importSnapshotFile(
        makeFile(
          JSON.stringify({
            version: 2,
            project: { name: "X", createdAt: 1 },
            state: { guests: "nope", tables: [] },
          }),
        ),
      ),
    ).rejects.toThrow();
  });
});

describe("snapshot export", () => {
  it("writes a v2 shaped JSON blob", () => {
    const captured: string[] = [];
    const fakeAnchor = { href: "", download: "", click: () => {} };
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob://url",
      revokeObjectURL: () => {},
    });
    vi.stubGlobal("document", {
      createElement: () => fakeAnchor,
      body: { appendChild: () => {}, removeChild: () => {} },
    });
    vi.stubGlobal(
      "Blob",
      class {
        constructor(parts: BlobPart[]) {
          captured.push(parts.join(""));
        }
      },
    );

    exportSnapshotFile(
      {
        id: "p1",
        name: "My Chart",
        createdAt: 100,
        updatedAt: 200,
        guestCount: 1,
        tableCount: 1,
      },
      sampleState(),
    );

    expect(captured).toHaveLength(1);
    const parsed = JSON.parse(captured[0]);
    expect(parsed.version).toBe(2);
    expect(parsed.project.name).toBe("My Chart");
    expect(parsed.project.createdAt).toBe(100);
    expect(parsed.state.guests).toHaveLength(1);
    expect(fakeAnchor.download).toMatch(/^my-chart-/);
  });
});

describe("moveLegacyToBackup", () => {
  it("renames the legacy key to the backup key", () => {
    const payload = JSON.stringify({ guests: [], tables: [] });
    storage.set(K_LEGACY, payload);
    moveLegacyToBackup();
    expect(storage.has(K_LEGACY)).toBe(false);
    expect(storage.get(K_LEGACY_BACKUP)).toBe(payload);
  });

  it("is a no-op when no legacy data exists", () => {
    moveLegacyToBackup();
    expect(storage.has(K_LEGACY)).toBe(false);
    expect(storage.has(K_LEGACY_BACKUP)).toBe(false);
  });
});
