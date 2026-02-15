import { describe, it, expect, vi, afterEach } from "vitest";
import { formatRelativeTime } from "./format-time";

describe("formatRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for timestamps less than 60 seconds ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:00:30Z"));
    expect(formatRelativeTime("2025-01-15T12:00:00Z")).toBe("just now");
  });

  it("returns minutes ago for timestamps less than 60 minutes ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:05:00Z"));
    expect(formatRelativeTime("2025-01-15T12:00:00Z")).toBe("5m ago");
  });

  it("returns hours ago for timestamps less than 24 hours ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T15:00:00Z"));
    expect(formatRelativeTime("2025-01-15T12:00:00Z")).toBe("3h ago");
  });

  it("returns days ago for timestamps less than 30 days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-20T12:00:00Z"));
    expect(formatRelativeTime("2025-01-15T12:00:00Z")).toBe("5d ago");
  });

  it("returns localized date string for timestamps older than 30 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-03-01T12:00:00Z"));
    const result = formatRelativeTime("2025-01-15T12:00:00Z");
    expect(result).toMatch(/\d/); // contains digits (a date)
    expect(result).not.toContain("ago");
  });

  it("accepts Date objects", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:10:00Z"));
    expect(formatRelativeTime(new Date("2025-01-15T12:00:00Z"))).toBe(
      "10m ago",
    );
  });
});
