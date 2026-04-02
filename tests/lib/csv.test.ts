import { describe, it, expect } from "vitest";
import { parseCsv, detectMergeChanges } from "../../src/lib/csv";
import type { Guest } from "../../src/lib/types";

describe("parseCsv", () => {
  it("parses simple names", () => {
    expect(parseCsv("Alice\nBob\nCharlie")).toEqual([
      "Alice",
      "Bob",
      "Charlie",
    ]);
  });

  it("skips empty lines", () => {
    expect(parseCsv("Alice\n\nBob\n\n")).toEqual(["Alice", "Bob"]);
  });

  it("handles Windows line endings", () => {
    expect(parseCsv("Alice\r\nBob\r\n")).toEqual(["Alice", "Bob"]);
  });

  it("skips common header names", () => {
    expect(parseCsv("Name\nAlice\nBob")).toEqual(["Alice", "Bob"]);
    expect(parseCsv("Guest\nAlice")).toEqual(["Alice"]);
    expect(parseCsv("Full Name\nAlice")).toEqual(["Alice"]);
    expect(parseCsv("first last\nAlice")).toEqual(["Alice"]);
  });

  it("does not skip headers that are not on the first line", () => {
    expect(parseCsv("Alice\nName\nBob")).toEqual(["Alice", "Name", "Bob"]);
  });

  it("returns empty array for empty input", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("  \n  \n")).toEqual([]);
  });

  it("trims whitespace from names", () => {
    expect(parseCsv("  Alice  \n  Bob  ")).toEqual(["Alice", "Bob"]);
  });
});

describe("detectMergeChanges", () => {
  const guest = (name: string, tableId: string | null = null): Guest => ({
    id: crypto.randomUUID(),
    name,
    tableId,
  });

  it("detects new guests to add", () => {
    const existing = [guest("Alice")];
    const result = detectMergeChanges(existing, ["Alice", "Bob"]);
    expect(result.toAdd).toEqual(["Bob"]);
    expect(result.toKeep).toHaveLength(1);
    expect(result.toRemove).toHaveLength(0);
  });

  it("detects guests to remove", () => {
    const existing = [guest("Alice"), guest("Bob")];
    const result = detectMergeChanges(existing, ["Alice"]);
    expect(result.toAdd).toHaveLength(0);
    expect(result.toRemove).toHaveLength(1);
    expect(result.toRemove[0].name).toBe("Bob");
  });

  it("is case-insensitive", () => {
    const existing = [guest("alice")];
    const result = detectMergeChanges(existing, ["Alice"]);
    expect(result.toAdd).toHaveLength(0);
    expect(result.toKeep).toHaveLength(1);
    expect(result.toRemove).toHaveLength(0);
  });

  it("handles empty existing list", () => {
    const result = detectMergeChanges([], ["Alice", "Bob"]);
    expect(result.toAdd).toEqual(["Alice", "Bob"]);
    expect(result.toKeep).toHaveLength(0);
    expect(result.toRemove).toHaveLength(0);
  });

  it("handles empty incoming list", () => {
    const existing = [guest("Alice")];
    const result = detectMergeChanges(existing, []);
    expect(result.toAdd).toHaveLength(0);
    expect(result.toKeep).toHaveLength(0);
    expect(result.toRemove).toHaveLength(1);
  });
});
