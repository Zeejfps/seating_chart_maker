import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  importSnapshot,
} from "../../src/lib/persistence";
import type { ChartState, Snapshot } from "../../src/lib/types";

// Mock localStorage
const storage = new Map<string, string>();
beforeEach(() => {
  storage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
});

describe("saveToLocalStorage / loadFromLocalStorage", () => {
  it("round-trips valid state", () => {
    const state: ChartState = {
      guests: [{ id: "g1", name: "Alice", tableId: null }],
      tables: [{ id: "t1", name: "1", capacity: 8, x: 100, y: 200 }],
    };
    saveToLocalStorage(state);
    const loaded = loadFromLocalStorage();
    expect(loaded).not.toBeNull();
    expect(loaded!.guests).toHaveLength(1);
    expect(loaded!.guests[0].name).toBe("Alice");
    expect(loaded!.tables).toHaveLength(1);
  });

  it("returns null for empty localStorage", () => {
    expect(loadFromLocalStorage()).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    storage.set("seating-chart-v1", "not json");
    expect(loadFromLocalStorage()).toBeNull();
  });

  it("filters out invalid guest objects", () => {
    const raw = JSON.stringify({
      guests: [
        { id: "g1", name: "Alice", tableId: null },
        { id: 123, name: "Bad" }, // invalid: id is number
        { name: "NoId", tableId: null }, // invalid: no id
        "not an object", // invalid
      ],
      tables: [],
    });
    storage.set("seating-chart-v1", raw);
    const loaded = loadFromLocalStorage();
    expect(loaded).not.toBeNull();
    expect(loaded!.guests).toHaveLength(1);
    expect(loaded!.guests[0].name).toBe("Alice");
  });

  it("filters out invalid table objects", () => {
    const raw = JSON.stringify({
      guests: [],
      tables: [
        { id: "t1", name: "1", capacity: 8, x: 100, y: 200 },
        { id: "t2", name: "Bad", capacity: -1, x: 0, y: 0 }, // invalid: negative capacity
        { name: "NoId", capacity: 8 }, // invalid: no id
      ],
    });
    storage.set("seating-chart-v1", raw);
    const loaded = loadFromLocalStorage();
    expect(loaded).not.toBeNull();
    expect(loaded!.tables).toHaveLength(1);
    expect(loaded!.tables[0].name).toBe("1");
  });

  it("nullifies guest tableId referencing nonexistent table", () => {
    const raw = JSON.stringify({
      guests: [{ id: "g1", name: "Alice", tableId: "nonexistent" }],
      tables: [{ id: "t1", name: "1", capacity: 8, x: 100, y: 200 }],
    });
    storage.set("seating-chart-v1", raw);
    const loaded = loadFromLocalStorage();
    expect(loaded!.guests[0].tableId).toBeNull();
  });

  it("preserves valid guest tableId references", () => {
    const raw = JSON.stringify({
      guests: [{ id: "g1", name: "Alice", tableId: "t1" }],
      tables: [{ id: "t1", name: "1", capacity: 8, x: 100, y: 200 }],
    });
    storage.set("seating-chart-v1", raw);
    const loaded = loadFromLocalStorage();
    expect(loaded!.guests[0].tableId).toBe("t1");
  });
});

describe("importSnapshot", () => {
  function makeFile(content: string): File {
    return new File([content], "test.json", { type: "application/json" });
  }

  it("imports a valid snapshot", async () => {
    const snapshot: Snapshot = {
      version: 1,
      guests: [{ id: "g1", name: "Alice", tableId: null }],
      tables: [{ id: "t1", name: "1", capacity: 8, x: 100, y: 200 }],
    };
    const result = await importSnapshot(makeFile(JSON.stringify(snapshot)));
    expect(result.guests).toHaveLength(1);
    expect(result.tables).toHaveLength(1);
  });

  it("rejects invalid snapshot (wrong version)", async () => {
    const bad = { version: 2, guests: [], tables: [] };
    await expect(importSnapshot(makeFile(JSON.stringify(bad)))).rejects.toThrow(
      "Invalid snapshot file",
    );
  });

  it("rejects invalid snapshot (missing arrays)", async () => {
    const bad = { version: 1 };
    await expect(importSnapshot(makeFile(JSON.stringify(bad)))).rejects.toThrow(
      "Invalid snapshot file",
    );
  });

  it("filters invalid items during import", async () => {
    const snapshot = {
      version: 1,
      guests: [{ id: "g1", name: "Alice", tableId: null }, "invalid"],
      tables: [
        { id: "t1", name: "1", capacity: 8, x: 100, y: 200 },
        { invalid: true },
      ],
    };
    const result = await importSnapshot(makeFile(JSON.stringify(snapshot)));
    expect(result.guests).toHaveLength(1);
    expect(result.tables).toHaveLength(1);
  });
});
