import { describe, it, expect } from "vitest";
import {
  POLARITY_COLORS,
  ROOT_NODE_COLOR,
  TAG_COLOR_PALETTE,
  FILTERED_DIM_OPACITY,
  getPolarityColors,
  getEdgeColor,
  getContrastText,
} from "./colors";

describe("POLARITY_COLORS", () => {
  it("defines colors for tailwind, headwind, and neutral", () => {
    expect(POLARITY_COLORS.tailwind).toBeDefined();
    expect(POLARITY_COLORS.headwind).toBeDefined();
    expect(POLARITY_COLORS.neutral).toBeDefined();
  });

  it("each polarity has border, bg, text, and bar fields", () => {
    for (const polarity of ["tailwind", "headwind", "neutral"] as const) {
      const colors = POLARITY_COLORS[polarity];
      expect(colors.border).toMatch(/^#[0-9a-f]{6}$/i);
      expect(colors.bg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(colors.text).toMatch(/^#[0-9a-f]{6}$/i);
      expect(colors.bar).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("uses visually distinct colors for each polarity", () => {
    const borders = new Set([
      POLARITY_COLORS.tailwind.border,
      POLARITY_COLORS.headwind.border,
      POLARITY_COLORS.neutral.border,
    ]);
    expect(borders.size).toBe(3);
  });
});

describe("ROOT_NODE_COLOR", () => {
  it("has border, bg, and text fields", () => {
    expect(ROOT_NODE_COLOR.border).toMatch(/^#[0-9a-f]{6}$/i);
    expect(ROOT_NODE_COLOR.bg).toMatch(/^#[0-9a-f]{6}$/i);
    expect(ROOT_NODE_COLOR.text).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("is distinct from all polarity border colors", () => {
    expect(ROOT_NODE_COLOR.border).not.toBe(POLARITY_COLORS.tailwind.border);
    expect(ROOT_NODE_COLOR.border).not.toBe(POLARITY_COLORS.headwind.border);
    expect(ROOT_NODE_COLOR.border).not.toBe(POLARITY_COLORS.neutral.border);
  });
});

describe("getPolarityColors", () => {
  it("returns tailwind colors for polarity 'tailwind'", () => {
    expect(getPolarityColors("tailwind")).toBe(POLARITY_COLORS.tailwind);
  });

  it("returns headwind colors for polarity 'headwind'", () => {
    expect(getPolarityColors("headwind")).toBe(POLARITY_COLORS.headwind);
  });

  it("returns neutral colors for polarity 'neutral'", () => {
    expect(getPolarityColors("neutral")).toBe(POLARITY_COLORS.neutral);
  });

  it("returns ROOT_NODE_COLOR for null polarity (root node)", () => {
    expect(getPolarityColors(null)).toBe(ROOT_NODE_COLOR);
  });

  it("falls back to neutral for unknown polarity strings", () => {
    expect(getPolarityColors("unknown")).toBe(POLARITY_COLORS.neutral);
  });
});

describe("getEdgeColor", () => {
  it("returns tailwind border color for tailwind child", () => {
    expect(getEdgeColor("tailwind")).toBe(POLARITY_COLORS.tailwind.border);
  });

  it("returns headwind border color for headwind child", () => {
    expect(getEdgeColor("headwind")).toBe(POLARITY_COLORS.headwind.border);
  });

  it("returns neutral border color for neutral child", () => {
    expect(getEdgeColor("neutral")).toBe(POLARITY_COLORS.neutral.border);
  });

  it("returns root border color for null polarity", () => {
    expect(getEdgeColor(null)).toBe(ROOT_NODE_COLOR.border);
  });

  it("falls back to neutral for unknown polarity", () => {
    expect(getEdgeColor("other")).toBe(POLARITY_COLORS.neutral.border);
  });
});

describe("TAG_COLOR_PALETTE", () => {
  it("has 10 colors", () => {
    expect(TAG_COLOR_PALETTE).toHaveLength(10);
  });

  it("contains only valid hex color strings", () => {
    for (const color of TAG_COLOR_PALETTE) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("has all unique colors", () => {
    const unique = new Set(TAG_COLOR_PALETTE);
    expect(unique.size).toBe(TAG_COLOR_PALETTE.length);
  });
});

describe("getContrastText", () => {
  it("returns dark text for light backgrounds", () => {
    expect(getContrastText("#ffffff")).toBe("#1e293b");
    expect(getContrastText("#f0fdf4")).toBe("#1e293b");
    expect(getContrastText("#f59e0b")).toBe("#1e293b"); // amber
  });

  it("returns white text for dark backgrounds", () => {
    expect(getContrastText("#000000")).toBe("#ffffff");
    expect(getContrastText("#1e293b")).toBe("#ffffff");
    expect(getContrastText("#6366f1")).toBe("#ffffff"); // indigo
  });
});

describe("FILTERED_DIM_OPACITY", () => {
  it("is between 0 and 1", () => {
    expect(FILTERED_DIM_OPACITY).toBeGreaterThan(0);
    expect(FILTERED_DIM_OPACITY).toBeLessThan(1);
  });

  it("is in the 30-40% range per spec 005", () => {
    expect(FILTERED_DIM_OPACITY).toBeGreaterThanOrEqual(0.3);
    expect(FILTERED_DIM_OPACITY).toBeLessThanOrEqual(0.4);
  });
});
