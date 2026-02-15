import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  type Node as RFNode,
  type Edge as RFEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { trpc } from "@/lib/trpc";

/**
 * Simple radial layout: root at center, children in concentric rings.
 * This is a basic version — task 11.2 will replace it with a proper
 * auto-spacing radial algorithm.
 */
function computeLayout(
  nodes: MapNode[],
): { rfNodes: RFNode[]; rfEdges: RFEdge[] } {
  if (nodes.length === 0) {
    return { rfNodes: [], rfEdges: [] };
  }

  // Build parent -> children lookup
  const childrenMap = new Map<string | null, MapNode[]>();
  let rootNode: MapNode | undefined;

  for (const node of nodes) {
    if (node.parentId === null) {
      rootNode = node;
    }
    const parentId = node.parentId;
    const siblings = childrenMap.get(parentId) ?? [];
    siblings.push(node);
    childrenMap.set(parentId, siblings);
  }

  if (!rootNode) {
    return { rfNodes: [], rfEdges: [] };
  }

  const rfNodes: RFNode[] = [];
  const rfEdges: RFEdge[] = [];

  const RING_RADIUS = 250;
  const NODE_WIDTH = 200;
  const NODE_HEIGHT = 60;

  // BFS to assign positions in concentric rings
  type QueueItem = { node: MapNode; depth: number; angleStart: number; angleEnd: number };
  const queue: QueueItem[] = [
    { node: rootNode, depth: 0, angleStart: 0, angleEnd: 2 * Math.PI },
  ];

  while (queue.length > 0) {
    const item = queue.shift()!;
    const { node, depth, angleStart, angleEnd } = item;

    // Position
    let x: number;
    let y: number;

    if (depth === 0) {
      x = 0;
      y = 0;
    } else {
      const angle = (angleStart + angleEnd) / 2;
      const radius = depth * RING_RADIUS;
      x = Math.cos(angle) * radius;
      y = Math.sin(angle) * radius;
    }

    rfNodes.push({
      id: node.id,
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
      data: {
        label: node.statement || "(untitled)",
        node,
      },
      style: {
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
      },
    });

    // Edge from parent
    if (node.parentId) {
      rfEdges.push({
        id: `edge-${node.parentId}-${node.id}`,
        source: node.parentId,
        target: node.id,
        type: "default",
      });
    }

    // Queue children with evenly divided arc
    const children = childrenMap.get(node.id) ?? [];
    if (children.length > 0) {
      const arcPerChild = (angleEnd - angleStart) / children.length;
      children.forEach((child, i) => {
        queue.push({
          node: child,
          depth: depth + 1,
          angleStart: angleStart + i * arcPerChild,
          angleEnd: angleStart + (i + 1) * arcPerChild,
        });
      });
    }
  }

  return { rfNodes, rfEdges };
}

type MapNode = {
  id: string;
  mapId: string;
  parentId: string | null;
  statement: string;
  body: string;
  strength: number | null;
  polarity: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  nodeTags: Array<{ tag: { id: string; name: string; color: string } }>;
  attachments: Array<{ id: string; type: string }>;
  tags: Array<{ id: string; name: string; color: string }>;
  aggregation: {
    tailwindTotal: number;
    headwindTotal: number;
    balanceRatio: number;
  } | null;
};

export function MapView() {
  const { id } = useParams<{ id: string }>();

  const { data: map, isLoading, error } = trpc.map.getById.useQuery(
    { id: id! },
    { enabled: !!id },
  );

  const { rfNodes, rfEdges } = useMemo(() => {
    if (!map) return { rfNodes: [], rfEdges: [] };
    return computeLayout(map.nodes as MapNode[]);
  }, [map]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-3rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-3rem)] flex-col items-center justify-center gap-4">
        <p className="text-sm text-destructive">
          {error.message === "Map not found"
            ? "This map doesn't exist or has been deleted."
            : "Failed to load map. Please try again later."}
        </p>
        <Link
          to="/"
          className="text-sm text-primary underline hover:text-primary/80"
        >
          Back to maps
        </Link>
      </div>
    );
  }

  if (!map) {
    return null;
  }

  return (
    <div className="h-[calc(100vh-3rem)] w-full">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: false }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
