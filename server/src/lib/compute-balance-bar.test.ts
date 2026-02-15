import { describe, it, expect } from "vitest";
import { computeBalanceBar } from "./compute-balance-bar.js";

describe("computeBalanceBar", () => {
  it("returns null for empty children array", () => {
    expect(computeBalanceBar([])).toBeNull();
  });

  it("returns null when all children are neutral", () => {
    const children = [
      { polarity: "neutral", strength: 50 },
      { polarity: "neutral", strength: 80 },
      { polarity: "neutral", strength: 30 },
    ];
    expect(computeBalanceBar(children)).toBeNull();
  });

  it("returns null when all non-neutral children have 0 strength", () => {
    const children = [
      { polarity: "tailwind", strength: 0 },
      { polarity: "headwind", strength: 0 },
      { polarity: "neutral", strength: 70 },
    ];
    expect(computeBalanceBar(children)).toBeNull();
  });

  it("computes correctly for all-tailwind children", () => {
    const children = [
      { polarity: "tailwind", strength: 60 },
      { polarity: "tailwind", strength: 40 },
    ];
    const result = computeBalanceBar(children);
    expect(result).toEqual({
      tailwindTotal: 100,
      headwindTotal: 0,
      balanceRatio: 1,
    });
  });

  it("computes correctly for all-headwind children", () => {
    const children = [
      { polarity: "headwind", strength: 30 },
      { polarity: "headwind", strength: 70 },
    ];
    const result = computeBalanceBar(children);
    expect(result).toEqual({
      tailwindTotal: 0,
      headwindTotal: 100,
      balanceRatio: 0,
    });
  });

  it("computes correctly for mixed tailwind and headwind", () => {
    const children = [
      { polarity: "tailwind", strength: 50 },
      { polarity: "headwind", strength: 50 },
    ];
    const result = computeBalanceBar(children);
    expect(result).toEqual({
      tailwindTotal: 50,
      headwindTotal: 50,
      balanceRatio: 0.5,
    });
  });

  it("computes the spec example: 80+40 tailwind, 60 headwind, 70 neutral = 67% tailwind", () => {
    const children = [
      { polarity: "tailwind", strength: 80 },
      { polarity: "headwind", strength: 60 },
      { polarity: "tailwind", strength: 40 },
      { polarity: "neutral", strength: 70 },
    ];
    const result = computeBalanceBar(children);
    expect(result).not.toBeNull();
    expect(result!.tailwindTotal).toBe(120);
    expect(result!.headwindTotal).toBe(60);
    expect(result!.balanceRatio).toBeCloseTo(120 / 180, 10);
  });

  it("handles a single tailwind child", () => {
    const children = [{ polarity: "tailwind", strength: 90 }];
    const result = computeBalanceBar(children);
    expect(result).toEqual({
      tailwindTotal: 90,
      headwindTotal: 0,
      balanceRatio: 1,
    });
  });

  it("handles a single headwind child", () => {
    const children = [{ polarity: "headwind", strength: 45 }];
    const result = computeBalanceBar(children);
    expect(result).toEqual({
      tailwindTotal: 0,
      headwindTotal: 45,
      balanceRatio: 0,
    });
  });

  it("handles a single neutral child", () => {
    const children = [{ polarity: "neutral", strength: 100 }];
    expect(computeBalanceBar(children)).toBeNull();
  });

  it("excludes neutral children from totals", () => {
    const children = [
      { polarity: "tailwind", strength: 30 },
      { polarity: "neutral", strength: 100 },
      { polarity: "headwind", strength: 20 },
      { polarity: "neutral", strength: 50 },
    ];
    const result = computeBalanceBar(children);
    expect(result).toEqual({
      tailwindTotal: 30,
      headwindTotal: 20,
      balanceRatio: 30 / 50,
    });
  });

  it("treats null strength as 0", () => {
    const children = [
      { polarity: "tailwind", strength: null },
      { polarity: "headwind", strength: 50 },
    ];
    const result = computeBalanceBar(children);
    expect(result).toEqual({
      tailwindTotal: 0,
      headwindTotal: 50,
      balanceRatio: 0,
    });
  });

  it("treats null polarity as non-contributing (root node children scenario)", () => {
    const children = [
      { polarity: null, strength: 80 },
      { polarity: "tailwind", strength: 60 },
    ];
    const result = computeBalanceBar(children);
    expect(result).toEqual({
      tailwindTotal: 60,
      headwindTotal: 0,
      balanceRatio: 1,
    });
  });

  it("handles many children correctly", () => {
    const children = [
      { polarity: "tailwind", strength: 10 },
      { polarity: "tailwind", strength: 20 },
      { polarity: "tailwind", strength: 30 },
      { polarity: "headwind", strength: 15 },
      { polarity: "headwind", strength: 25 },
      { polarity: "neutral", strength: 50 },
      { polarity: "neutral", strength: 0 },
      { polarity: "tailwind", strength: 0 },
      { polarity: "headwind", strength: 0 },
    ];
    const result = computeBalanceBar(children);
    expect(result).toEqual({
      tailwindTotal: 60,
      headwindTotal: 40,
      balanceRatio: 0.6,
    });
  });
});
