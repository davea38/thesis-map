import { useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { trpc } from "@/lib/trpc";
import { computeRadialLayout } from "@/lib/radial-layout";
import { ThesisNode } from "@/components/thesis-node";
import { SidePanel } from "@/components/side-panel";
import { useUIStore } from "@/stores/ui-store";

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

const nodeTypes = { thesis: ThesisNode };

export function MapView() {
  const { id } = useParams<{ id: string }>();
  const selectedNodeId = useUIStore((s) => s.selectedNodeId);
  const selectNode = useUIStore((s) => s.selectNode);
  const clearSelection = useUIStore((s) => s.clearSelection);

  const { data: map, isLoading, error } = trpc.map.getById.useQuery(
    { id: id! },
    { enabled: !!id },
  );

  const { rfNodes: layoutNodes, rfEdges } = useMemo(() => {
    if (!map) return { rfNodes: [], rfEdges: [] };
    return computeRadialLayout(map.nodes as MapNode[]);
  }, [map]);

  // Sync React Flow's selected state with Zustand store
  const rfNodes = useMemo(() => {
    return layoutNodes.map((node) => ({
      ...node,
      selected: node.id === selectedNodeId,
    }));
  }, [layoutNodes, selectedNodeId]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  const onPaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

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
    <div className="h-[calc(100vh-3rem)] w-full relative">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: false }}
      >
        <Background />
        <Controls />
      </ReactFlow>
      <SidePanel />
    </div>
  );
}
