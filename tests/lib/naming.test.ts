import { describe, it, expect } from "vitest";
import { uniqueName } from "../../src/lib/projects/naming";

describe("uniqueName", () => {
  it("returns base when unused", () => {
    expect(uniqueName("Untitled", [])).toBe("Untitled");
  });

  it("appends 2 on first collision", () => {
    expect(uniqueName("Untitled", ["Untitled"])).toBe("Untitled 2");
  });

  it("increments past existing suffixes", () => {
    expect(
      uniqueName("Untitled", ["Untitled", "Untitled 2", "Untitled 3"]),
    ).toBe("Untitled 4");
  });

  it("excludes names based on caller filtering (rename use case)", () => {
    // Caller passes the list excluding the project being renamed, so the
    // same name coming back unchanged is expected when only the renamed
    // project has it.
    expect(uniqueName("Alpha", [])).toBe("Alpha");
  });
});
