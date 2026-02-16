import { useMemo, useCallback, useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
import { PolarityEdge } from "@/components/polarity-edge";
import { SidePanel } from "@/components/side-panel";
import { NodeContextMenu } from "@/components/node-context-menu";
import { DeleteNodeDialog } from "@/components/delete-node-dialog";
import { DeleteMapDialog } from "@/components/delete-map-dialog";
import { MapToolbar } from "@/components/map-toolbar";
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
const edgeTypes = { polarity: PolarityEdge };

export function MapView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const selectedNodeId = useUIStore((s) => s.selectedNodeId);
  const selectNode = useUIStore((s) => s.selectNode);
  const clearSelection = useUIStore((s) => s.clearSelection);
  const setInlineEditNodeId = useUIStore((s) => s.setInlineEditNodeId);
  const openContextMenu = useUIStore((s) => s.openContextMenu);
  const closeContextMenu = useUIStore((s) => s.closeContextMenu);

  const [deleteNodeId, setDeleteNodeId] = useState<string | null>(null);
  const [deleteMapOpen, setDeleteMapOpen] = useState(false);

  const { data: map, isLoading, error } = trpc.map.getById.useQuery(
    { id: id! },
    { enabled: !!id },
  );

  const { rfNodes: layoutNodes, rfEdges } = useMemo(() => {
    if (!map) return { rfNodes: [], rfEdges: [] };
    return computeRadialLayout(map.nodes as MapNode[]);
  }, [map]);

  // Build a lookup map for node data (used by context menu)
  const nodeDataMap = useMemo(() => {
    if (!map) return new Map();
    const m = new Map<
      string,
      {
        id: string;
        parentId: string | null;
        tags: Array<{ id: string; name: string; color: string }>;
      }
    >();
    for (const node of map.nodes as MapNode[]) {
      m.set(node.id, {
        id: node.id,
        parentId: node.parentId,
        tags: node.tags,
      });
    }
    return m;
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

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      setInlineEditNodeId(node.id);
    },
    [setInlineEditNodeId],
  );

  const onNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node) => {
      event.preventDefault();
      openContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
      });
    },
    [openContextMenu],
  );

  const onPaneClick = useCallback(() => {
    clearSelection();
    setInlineEditNodeId(null);
    closeContextMenu();
  }, [clearSelection, setInlineEditNodeId, closeContextMenu]);

  const handleDeleteRequest = useCallback(
    (nodeId: string) => {
      const nodeData = nodeDataMap.get(nodeId);
      if (nodeData && nodeData.parentId === null) {
        // Root node — redirect to map deletion
        setDeleteMapOpen(true);
      } else {
        setDeleteNodeId(nodeId);
      }
    },
    [nodeDataMap],
  );

  // Read inline edit and context menu state for keyboard shortcut guards
  const inlineEditNodeId = useUIStore((s) => s.inlineEditNodeId);
  const contextMenuState = useUIStore((s) => s.contextMenuState);

  // Keyboard shortcuts (spec 010):
  // Escape — deselect and close side panel
  // Delete/Backspace — delete selected node (with confirmation)
  // Enter — activate inline edit on selected node
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept when typing in form fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Don't intercept when inline edit is active
      if (inlineEditNodeId) return;

      // Don't intercept when context menu is open
      if (contextMenuState) return;

      if (e.key === "Escape") {
        if (selectedNodeId) {
          e.preventDefault();
          clearSelection();
        }
        return;
      }

      // Remaining shortcuts require a selected node
      if (!selectedNodeId) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDeleteRequest(selectedNodeId);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        setInlineEditNodeId(selectedNodeId);
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedNodeId,
    inlineEditNodeId,
    contextMenuState,
    clearSelection,
    handleDeleteRequest,
    setInlineEditNodeId,
  ]);

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
      <MapToolbar mapId={map.id} mapName={map.name} onDeleteRequest={() => setDeleteMapOpen(true)} />
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
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
      {map && (
        <NodeContextMenu
          mapId={map.id}
          nodes={nodeDataMap}
          onDeleteRequest={handleDeleteRequest}
        />
      )}
      <DeleteNodeDialog
        nodeId={deleteNodeId}
        onClose={() => setDeleteNodeId(null)}
      />
      <DeleteMapDialog
        mapId={deleteMapOpen ? id! : null}
        mapName={map?.name ?? ""}
        onClose={() => setDeleteMapOpen(false)}
        onDeleted={() => navigate("/")}
      />
    </div>
  );
}
