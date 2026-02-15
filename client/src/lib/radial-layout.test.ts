import { describe, it, expect } from "vitest";
import {
  computeRadialLayout,
  NODE_WIDTH,
  NODE_HEIGHT,
  type LayoutNode,
} from "./radial-layout";

function makeNode(
  id: string,
  parentId: string | null,
  statement = "",
): LayoutNode {
  return { id, parentId, statement };
}

/** Get the center position of a React Flow node. */
function nodeCenter(n: { position: { x: number; y: number } }) {
  return {
    x: n.position.x + NODE_WIDTH / 2,
    y: n.position.y + NODE_HEIGHT / 2,
  };
}

/** Distance from a node center to the origin. */
function distFromOrigin(n: { position: { x: number; y: number } }) {
  const c = nodeCenter(n);
  return Math.sqrt(c.x * c.x + c.y * c.y);
}

describe("computeRadialLayout", () => {
  it("returns empty arrays for empty input", () => {
    const result = computeRadialLayout([]);
    expect(result.rfNodes).toEqual([]);
    expect(result.rfEdges).toEqual([]);
  });

  it("returns empty arrays when no root node exists", () => {
    const nodes = [makeNode("a", "nonexistent")];
    const result = computeRadialLayout(nodes);
    expect(result.rfNodes).toEqual([]);
    expect(result.rfEdges).toEqual([]);
  });

  it("places a single root node at the center", () => {
    const nodes = [makeNode("root", null, "thesis")];
    const result = computeRadialLayout(nodes);

    expect(result.rfNodes).toHaveLength(1);
    expect(result.rfEdges).toHaveLength(0);

    const rootNode = result.rfNodes[0]!;
    expect(rootNode.id).toBe("root");
    expect(rootNode.position.x).toBe(-NODE_WIDTH / 2);
    expect(rootNode.position.y).toBe(-NODE_HEIGHT / 2);
    expect(rootNode.data.label).toBe("thesis");
  });

  it("uses '(untitled)' label for nodes with empty statement", () => {
    const nodes = [makeNode("root", null, "")];
    const result = computeRadialLayout(nodes);
    expect(result.rfNodes[0]!.data.label).toBe("(untitled)");
  });

  it("places a single child on the first ring", () => {
    const nodes = [
      makeNode("root", null, "thesis"),
      makeNode("child1", "root", "argument"),
    ];
    const result = computeRadialLayout(nodes);

    expect(result.rfNodes).toHaveLength(2);
    expect(result.rfEdges).toHaveLength(1);

    // Root at center
    const root = result.rfNodes.find((n) => n.id === "root")!;
    expect(root.position.x).toBe(-NODE_WIDTH / 2);

    // Child should be on the first ring (not at center)
    const child = result.rfNodes.find((n) => n.id === "child1")!;
    expect(distFromOrigin(child)).toBeGreaterThan(100);

    // Edge connects root to child
    const edge = result.rfEdges[0]!;
    expect(edge.source).toBe("root");
    expect(edge.target).toBe("child1");
  });

  it("distributes multiple children evenly around the root", () => {
    const nodes = [
      makeNode("root", null),
      makeNode("c1", "root"),
      makeNode("c2", "root"),
      makeNode("c3", "root"),
      makeNode("c4", "root"),
    ];
    const result = computeRadialLayout(nodes);

    expect(result.rfNodes).toHaveLength(5);
    expect(result.rfEdges).toHaveLength(4);

    // All children should be equidistant from center (same ring)
    const children = result.rfNodes.filter((n) => n.id !== "root");
    const distances = children.map((c) => distFromOrigin(c));
    const firstDist = distances[0]!;

    // All distances should be approximately the same
    for (const d of distances) {
      expect(d).toBeCloseTo(firstDist, 1);
    }

    // Children should be roughly evenly spaced angularly
    const angles = children.map((c) => {
      const center = nodeCenter(c);
      return Math.atan2(center.y, center.x);
    });
    angles.sort((a, b) => a - b);

    // Adjacent angle differences should be approximately equal
    const diffs: number[] = [];
    for (let i = 1; i < angles.length; i++) {
      diffs.push(angles[i]! - angles[i - 1]!);
    }
    // Wrap-around difference
    diffs.push(2 * Math.PI - (angles[angles.length - 1]! - angles[0]!));

    // Each diff should be roughly 2π/4 = π/2
    for (const diff of diffs) {
      expect(diff).toBeCloseTo(Math.PI / 2, 0);
    }
  });

  it("places grandchildren on a further ring than children", () => {
    const nodes = [
      makeNode("root", null),
      makeNode("c1", "root"),
      makeNode("gc1", "c1"),
    ];
    const result = computeRadialLayout(nodes);

    expect(result.rfNodes).toHaveLength(3);
    expect(result.rfEdges).toHaveLength(2);

    const child = result.rfNodes.find((n) => n.id === "c1")!;
    const grandchild = result.rfNodes.find((n) => n.id === "gc1")!;

    // Grandchild should be further from center than child
    expect(distFromOrigin(grandchild)).toBeGreaterThan(distFromOrigin(child));
  });

  it("gives more arc space to subtrees with more leaves", () => {
    // root -> c1 (has 3 children), c2 (leaf)
    const nodes = [
      makeNode("root", null),
      makeNode("c1", "root"),
      makeNode("c2", "root"),
      makeNode("gc1", "c1"),
      makeNode("gc2", "c1"),
      makeNode("gc3", "c1"),
    ];
    const result = computeRadialLayout(nodes);

    expect(result.rfNodes).toHaveLength(6);

    // c1's grandchildren should span a wider arc than c2 would occupy
    const gc1 = result.rfNodes.find((n) => n.id === "gc1")!;
    const gc3 = result.rfNodes.find((n) => n.id === "gc3")!;

    const gc1Center = nodeCenter(gc1);
    const gc3Center = nodeCenter(gc3);
    const gc1Angle = Math.atan2(gc1Center.y, gc1Center.x);
    const gc3Angle = Math.atan2(gc3Center.y, gc3Center.x);

    // The angular span of the 3 grandchildren should be substantial
    const span = Math.abs(gc3Angle - gc1Angle);
    expect(span).toBeGreaterThan(0.1);
  });

  it("generates correct edge IDs", () => {
    const nodes = [
      makeNode("root", null),
      makeNode("c1", "root"),
      makeNode("gc1", "c1"),
    ];
    const result = computeRadialLayout(nodes);

    const edgeIds = result.rfEdges.map((e) => e.id);
    expect(edgeIds).toContain("edge-root-c1");
    expect(edgeIds).toContain("edge-c1-gc1");
  });

  it("handles a deep linear chain (no branching)", () => {
    const nodes = [
      makeNode("n0", null),
      makeNode("n1", "n0"),
      makeNode("n2", "n1"),
      makeNode("n3", "n2"),
      makeNode("n4", "n3"),
    ];
    const result = computeRadialLayout(nodes);

    expect(result.rfNodes).toHaveLength(5);
    expect(result.rfEdges).toHaveLength(4);

    // Sort by ID to get them in depth order
    const sortedNodes = [...result.rfNodes].sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    const sortedDistances = sortedNodes.map((n) => distFromOrigin(n));

    // Each node should be further from center than the previous
    for (let i = 1; i < sortedDistances.length; i++) {
      expect(sortedDistances[i]!).toBeGreaterThan(sortedDistances[i - 1]!);
    }
  });

  it("handles a wide tree (many children of root)", () => {
    const nodes: LayoutNode[] = [makeNode("root", null)];
    for (let i = 0; i < 20; i++) {
      nodes.push(makeNode(`c${i}`, "root"));
    }
    const result = computeRadialLayout(nodes);

    expect(result.rfNodes).toHaveLength(21);
    expect(result.rfEdges).toHaveLength(20);

    // No two children should be at the exact same position
    const children = result.rfNodes.filter((n) => n.id !== "root");
    for (let i = 0; i < children.length; i++) {
      for (let j = i + 1; j < children.length; j++) {
        const ci = children[i]!;
        const cj = children[j]!;
        const dx = ci.position.x - cj.position.x;
        const dy = ci.position.y - cj.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        expect(dist).toBeGreaterThan(1);
      }
    }
  });

  it("sets correct node dimensions in style", () => {
    const nodes = [makeNode("root", null), makeNode("c1", "root")];
    const result = computeRadialLayout(nodes);

    for (const node of result.rfNodes) {
      expect(node.style).toEqual({
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
      });
    }
  });

  it("preserves node data with all properties", () => {
    const node: LayoutNode = {
      id: "root",
      parentId: null,
      statement: "My thesis",
      mapId: "map1",
      body: "details",
      polarity: "tailwind",
      strength: 80,
    };
    const result = computeRadialLayout([node]);

    expect(result.rfNodes[0]!.data.node).toBe(node);
    expect(result.rfNodes[0]!.data.label).toBe("My thesis");
  });

  it("handles asymmetric trees without overlaps", () => {
    // Build a lopsided tree:
    // root -> left (deep chain of 5), right (single leaf)
    const nodes: LayoutNode[] = [
      makeNode("root", null),
      makeNode("left", "root"),
      makeNode("right", "root"),
      makeNode("l1", "left"),
      makeNode("l2", "l1"),
      makeNode("l3", "l2"),
      makeNode("l4", "l3"),
    ];
    const result = computeRadialLayout(nodes);

    expect(result.rfNodes).toHaveLength(7);

    // Check that no two nodes at the same depth have overlapping positions
    for (let i = 0; i < result.rfNodes.length; i++) {
      for (let j = i + 1; j < result.rfNodes.length; j++) {
        const a = result.rfNodes[i]!;
        const b = result.rfNodes[j]!;
        const distA = distFromOrigin(a);
        const distB = distFromOrigin(b);
        if (Math.abs(distA - distB) > 50) continue; // different rings

        // Same ring — check they don't overlap
        const dx = Math.abs(a.position.x - b.position.x);
        const dy = Math.abs(a.position.y - b.position.y);
        const overlap = dx < NODE_WIDTH && dy < NODE_HEIGHT;
        expect(overlap).toBe(false);
      }
    }
  });
});
