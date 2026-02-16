import { describe, it, expect } from "vitest";
import { computeDimmedNodeIds } from "./tag-filter";

function makeNode(id: string, tagIds: string[]) {
  return {
    id,
    tags: tagIds.map((tid) => ({ id: tid })),
  };
}

describe("computeDimmedNodeIds", () => {
  it("returns empty set when no filters are active", () => {
    const nodes = [
      makeNode("n1", ["t1"]),
      makeNode("n2", []),
    ];
    const result = computeDimmedNodeIds(nodes, new Set());
    expect(result.size).toBe(0);
  });

  it("dims nodes that have no matching tags", () => {
    const nodes = [
      makeNode("n1", ["t1"]),
      makeNode("n2", ["t2"]),
      makeNode("n3", []),
    ];
    const result = computeDimmedNodeIds(nodes, new Set(["t1"]));
    expect(result.has("n1")).toBe(false);
    expect(result.has("n2")).toBe(true);
    expect(result.has("n3")).toBe(true);
  });

  it("does not dim nodes that have at least one matching tag", () => {
    const nodes = [
      makeNode("n1", ["t1", "t2"]),
      makeNode("n2", ["t2", "t3"]),
    ];
    const result = computeDimmedNodeIds(nodes, new Set(["t1"]));
    expect(result.has("n1")).toBe(false); // has t1
    expect(result.has("n2")).toBe(true);  // no t1
  });

  it("handles multiple active filters (OR logic)", () => {
    const nodes = [
      makeNode("n1", ["t1"]),
      makeNode("n2", ["t2"]),
      makeNode("n3", ["t3"]),
      makeNode("n4", []),
    ];
    const result = computeDimmedNodeIds(nodes, new Set(["t1", "t2"]));
    expect(result.has("n1")).toBe(false); // matches t1
    expect(result.has("n2")).toBe(false); // matches t2
    expect(result.has("n3")).toBe(true);  // no match
    expect(result.has("n4")).toBe(true);  // no tags at all
  });

  it("dims all nodes when filter has a tag that no node has", () => {
    const nodes = [
      makeNode("n1", ["t1"]),
      makeNode("n2", ["t2"]),
    ];
    const result = computeDimmedNodeIds(nodes, new Set(["nonexistent"]));
    expect(result.has("n1")).toBe(true);
    expect(result.has("n2")).toBe(true);
  });

  it("handles empty nodes array", () => {
    const result = computeDimmedNodeIds([], new Set(["t1"]));
    expect(result.size).toBe(0);
  });

  it("dims root node if it lacks matching tags", () => {
    const nodes = [
      makeNode("root", []),     // root, no tags
      makeNode("child", ["t1"]),
    ];
    const result = computeDimmedNodeIds(nodes, new Set(["t1"]));
    expect(result.has("root")).toBe(true);
    expect(result.has("child")).toBe(false);
  });

  it("does not dim root node if it has matching tags", () => {
    const nodes = [
      makeNode("root", ["t1"]),
      makeNode("child", []),
    ];
    const result = computeDimmedNodeIds(nodes, new Set(["t1"]));
    expect(result.has("root")).toBe(false);
    expect(result.has("child")).toBe(true);
  });
});
