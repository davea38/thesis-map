import type { Node as RFNode, Edge as RFEdge } from "@xyflow/react";

/**
 * Radial layout algorithm for thesis map trees.
 *
 * Places the root node at the center and arranges descendants in concentric
 * rings radiating outward. Each subtree receives arc space proportional to
 * the number of its leaves, preventing overlaps between large and small
 * subtrees. A minimum angular gap between siblings ensures nodes don't
 * touch when subtrees are small.
 */

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 60;

/** Minimum distance between concentric rings in pixels. */
const BASE_RING_RADIUS = 220;

/** Minimum angular separation between sibling nodes (radians). */
const MIN_SIBLING_GAP = 0.15;

/** Minimum arc per node to prevent extreme crowding (radians). */
const MIN_ARC_PER_LEAF = 0.25;

export interface LayoutNode {
  id: string;
  parentId: string | null;
  statement: string;
  [key: string]: unknown;
}

interface TreeNode {
  node: LayoutNode;
  children: TreeNode[];
  /** Number of leaves in this subtree (1 if this node is a leaf). */
  leafCount: number;
}

/**
 * Build a tree structure from a flat list of nodes.
 * Returns the root TreeNode or null if the list is empty / has no root.
 */
function buildTree(nodes: LayoutNode[]): TreeNode | null {
  if (nodes.length === 0) return null;

  const nodeMap = new Map<string, TreeNode>();
  let root: TreeNode | null = null;

  // First pass: create TreeNode wrappers
  for (const node of nodes) {
    nodeMap.set(node.id, { node, children: [], leafCount: 1 });
  }

  // Second pass: link children to parents
  for (const node of nodes) {
    const treeNode = nodeMap.get(node.id)!;
    if (node.parentId === null) {
      root = treeNode;
    } else {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children.push(treeNode);
      }
    }
  }

  if (!root) return null;

  // Third pass: compute leaf counts bottom-up (post-order)
  computeLeafCounts(root);

  return root;
}

/** Recursively compute the number of leaves in each subtree. */
function computeLeafCounts(treeNode: TreeNode): void {
  if (treeNode.children.length === 0) {
    treeNode.leafCount = 1;
    return;
  }

  for (const child of treeNode.children) {
    computeLeafCounts(child);
  }

  treeNode.leafCount = treeNode.children.reduce(
    (sum, c) => sum + c.leafCount,
    0,
  );
}

/**
 * Compute the ring radius for a given depth.
 * The first ring is slightly larger to give the root breathing room.
 */
function ringRadius(depth: number): number {
  if (depth === 0) return 0;
  return BASE_RING_RADIUS * depth;
}

/**
 * Compute radial layout positions for all nodes.
 * Returns React Flow nodes and edges ready for rendering.
 */
export function computeRadialLayout(nodes: LayoutNode[]): {
  rfNodes: RFNode[];
  rfEdges: RFEdge[];
} {
  const root = buildTree(nodes);
  if (!root) return { rfNodes: [], rfEdges: [] };

  const rfNodes: RFNode[] = [];
  const rfEdges: RFEdge[] = [];

  // Place root at center
  rfNodes.push({
    id: root.node.id,
    type: "thesis",
    position: { x: -NODE_WIDTH / 2, y: -NODE_HEIGHT / 2 },
    data: {
      label: root.node.statement || "(untitled)",
      node: root.node,
    },
    style: {
      width: NODE_WIDTH,
      minHeight: NODE_HEIGHT,
    },
  });

  // Lay out children recursively
  if (root.children.length > 0) {
    layoutChildren(root, 0, 2 * Math.PI, 1, rfNodes, rfEdges);
  }

  return { rfNodes, rfEdges };
}

/**
 * Recursively lay out children of a parent node.
 *
 * @param parent - The parent tree node
 * @param arcStart - Start angle of the arc available for this parent's children (radians)
 * @param arcEnd - End angle of the arc available for this parent's children (radians)
 * @param depth - Current depth (1 for root's direct children)
 * @param rfNodes - Accumulator for React Flow nodes
 * @param rfEdges - Accumulator for React Flow edges
 */
function layoutChildren(
  parent: TreeNode,
  arcStart: number,
  arcEnd: number,
  depth: number,
  rfNodes: RFNode[],
  rfEdges: RFEdge[],
): void {
  const children = parent.children;
  if (children.length === 0) return;

  const totalArc = arcEnd - arcStart;
  const totalLeaves = children.reduce((sum, c) => sum + c.leafCount, 0);

  // Compute the minimum arc needed based on leaf count constraints
  const minTotalArc = totalLeaves * MIN_ARC_PER_LEAF;

  // If the available arc is smaller than what we need, expand the ring radius.
  // But since we're using fixed ring radii for simplicity, we instead just
  // scale nodes within the available arc, accepting some crowding at extremes.

  // Distribute arc proportionally to leaf count, with minimum gap enforcement.
  // Step 1: Compute proportional arcs
  const rawArcs = children.map(
    (child) => (child.leafCount / totalLeaves) * totalArc,
  );

  // Step 2: Enforce minimum arc per subtree
  // Each subtree needs at least MIN_ARC_PER_LEAF for its contribution to look reasonable
  const minArcPerSubtree = MIN_SIBLING_GAP;
  let deficit = 0;
  let surplusTotal = 0;
  const arcs = rawArcs.map((arc) => {
    if (arc < minArcPerSubtree) {
      deficit += minArcPerSubtree - arc;
      return minArcPerSubtree;
    }
    surplusTotal += arc - minArcPerSubtree;
    return arc;
  });

  // Redistribute deficit from surplus nodes (proportionally)
  if (deficit > 0 && surplusTotal > 0) {
    const scale = Math.min(1, deficit / surplusTotal);
    for (let i = 0; i < arcs.length; i++) {
      const rawArc = rawArcs[i]!;
      if (rawArc > minArcPerSubtree) {
        const surplus = arcs[i]! - minArcPerSubtree;
        arcs[i] = arcs[i]! - surplus * scale;
      }
    }
  }

  // Step 3: Normalize to fit within available arc
  const arcSum = arcs.reduce((a, b) => a + b, 0);
  const useExpanded = minTotalArc > totalArc && depth === 1;
  const effectiveTotalArc = useExpanded
    ? Math.max(totalArc, minTotalArc)
    : totalArc;

  // Scale all arcs so they sum to the effective total
  if (arcSum > 0) {
    const normalizeScale = effectiveTotalArc / arcSum;
    for (let i = 0; i < arcs.length; i++) {
      arcs[i] = arcs[i]! * normalizeScale;
    }
  }

  // Step 4: Place each child at the midpoint of its arc segment
  let currentAngle = arcStart;

  for (let i = 0; i < children.length; i++) {
    const child = children[i]!;
    const childArc = arcs[i]!;
    const childArcStart = currentAngle;
    const childArcEnd = currentAngle + childArc;
    const midAngle = (childArcStart + childArcEnd) / 2;

    const radius = ringRadius(depth);
    const x = Math.cos(midAngle) * radius;
    const y = Math.sin(midAngle) * radius;

    rfNodes.push({
      id: child.node.id,
      type: "thesis",
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
      data: {
        label: child.node.statement || "(untitled)",
        node: child.node,
      },
      style: {
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
      },
    });

    rfEdges.push({
      id: `edge-${parent.node.id}-${child.node.id}`,
      source: parent.node.id,
      target: child.node.id,
      type: "polarity",
      data: {
        childPolarity: (child.node as Record<string, unknown>).polarity as string | null ?? null,
      },
    });

    // Recurse into children
    if (child.children.length > 0) {
      layoutChildren(child, childArcStart, childArcEnd, depth + 1, rfNodes, rfEdges);
    }

    currentAngle = childArcEnd;
  }
}
