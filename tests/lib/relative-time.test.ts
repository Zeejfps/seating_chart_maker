import { describe, it, expect } from "vitest";
import { relativeTime } from "../../src/lib/relative-time";

describe("relativeTime", () => {
  const now = 1_700_000_000_000;
  const SEC = 1000;
  const MIN = 60 * SEC;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  it("returns 'just now' below 45s", () => {
    expect(relativeTime(now - 30 * SEC, now)).toBe("just now");
    expect(relativeTime(now - 44 * SEC, now)).toBe("just now");
  });

  it("returns minutes at 45s+", () => {
    expect(relativeTime(now - 1 * MIN, now)).toBe("1 minute ago");
    expect(relativeTime(now - 5 * MIN, now)).toBe("5 minutes ago");
  });

  it("returns hours at 60m+", () => {
    expect(relativeTime(now - 1 * HOUR, now)).toBe("1 hour ago");
    expect(relativeTime(now - 3 * HOUR, now)).toBe("3 hours ago");
  });

  it("returns days at 24h+", () => {
    expect(relativeTime(now - 1 * DAY, now)).toBe("1 day ago");
    expect(relativeTime(now - 7 * DAY, now)).toBe("7 days ago");
  });

  it("returns months at ~30d+", () => {
    expect(relativeTime(now - 31 * DAY, now)).toBe("1 month ago");
    expect(relativeTime(now - 90 * DAY, now)).toBe("2 months ago");
  });

  it("returns years at 12mo+", () => {
    expect(relativeTime(now - 400 * DAY, now)).toBe("1 year ago");
  });

  it("treats future timestamps as 'just now'", () => {
    expect(relativeTime(now + 10 * SEC, now)).toBe("just now");
  });
});
