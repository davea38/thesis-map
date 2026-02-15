import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactFlowProvider } from "@xyflow/react";
import { ThesisNode, type ThesisNodeData } from "./thesis-node";
import { useUIStore } from "@/stores/ui-store";

function makeNodeData(overrides: Partial<ThesisNodeData["node"]> = {}): ThesisNodeData {
  return {
    label: overrides.statement ?? "Test statement",
    node: {
      id: "node-1",
      parentId: "parent-1",
      statement: "Test statement",
      polarity: "neutral",
      strength: 50,
      tags: [],
      attachments: [],
      aggregation: null,
      ...overrides,
    },
  };
}

// Minimal NodeProps shape for testing
function makeProps(data: ThesisNodeData) {
  return {
    id: data.node.id,
    data,
    type: "thesis" as const,
    selected: false,
    isConnectable: true,
    zIndex: 0,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    dragging: false,
    deletable: false,
    selectable: true,
    draggable: true,
    parentId: undefined,
    sourcePosition: undefined,
    targetPosition: undefined,
    width: 200,
    height: 60,
  } as Parameters<typeof ThesisNode>[0];
}

function renderNode(data: ThesisNodeData) {
  const user = userEvent.setup();
  const result = render(
    <ReactFlowProvider>
      <ThesisNode {...makeProps(data)} />
    </ReactFlowProvider>,
  );
  return { ...result, user };
}

beforeEach(() => {
  useUIStore.setState({
    selectedNodeId: null,
    sidePanelOpen: false,
    sidePanelScrollTarget: null,
  });
});

describe("ThesisNode", () => {
  describe("statement display", () => {
    it("renders the node statement text", () => {
      renderNode(makeNodeData({ statement: "Climate change is real" }));
      expect(screen.getByText("Climate change is real")).toBeInTheDocument();
    });

    it("renders '(untitled)' for empty statement", () => {
      renderNode(makeNodeData({ statement: "" }));
      expect(screen.getByText("(untitled)")).toBeInTheDocument();
    });

    it("shows full statement in title attribute for long text", () => {
      const longStatement = "This is a very long statement that should be truncated on screen but visible in the tooltip";
      renderNode(makeNodeData({ statement: longStatement }));
      expect(screen.getByTitle(longStatement)).toBeInTheDocument();
    });
  });

  describe("polarity color coding", () => {
    it("applies tailwind colors for tailwind polarity", () => {
      renderNode(makeNodeData({ polarity: "tailwind" }));
      const nodeEl = screen.getByText("Test statement").closest("div");
      expect(nodeEl).toHaveStyle({ borderColor: "#22c55e" });
    });

    it("applies headwind colors for headwind polarity", () => {
      renderNode(makeNodeData({ polarity: "headwind" }));
      const nodeEl = screen.getByText("Test statement").closest("div");
      expect(nodeEl).toHaveStyle({ borderColor: "#ef4444" });
    });

    it("applies neutral colors for neutral polarity", () => {
      renderNode(makeNodeData({ polarity: "neutral" }));
      const nodeEl = screen.getByText("Test statement").closest("div");
      expect(nodeEl).toHaveStyle({ borderColor: "#94a3b8" });
    });

    it("applies root colors for null polarity (root node)", () => {
      renderNode(makeNodeData({ parentId: null, polarity: null }));
      const nodeEl = screen.getByText("Test statement").closest("div");
      expect(nodeEl).toHaveStyle({ borderColor: "#6366f1" });
    });
  });

  describe("tag chips", () => {
    it("renders tag chips with correct names", () => {
      renderNode(
        makeNodeData({
          tags: [
            { id: "t1", name: "Economic", color: "#3b82f6" },
            { id: "t2", name: "Technical", color: "#ef4444" },
          ],
        }),
      );
      expect(screen.getByText("Economic")).toBeInTheDocument();
      expect(screen.getByText("Technical")).toBeInTheDocument();
    });

    it("applies tag colors as background", () => {
      renderNode(
        makeNodeData({
          tags: [{ id: "t1", name: "Economic", color: "#3b82f6" }],
        }),
      );
      const chip = screen.getByText("Economic");
      expect(chip).toHaveStyle({ backgroundColor: "#3b82f6" });
    });

    it("does not render tag section when no tags", () => {
      const { container } = renderNode(makeNodeData({ tags: [] }));
      expect(container.querySelectorAll("[class*='rounded-full']")).toHaveLength(0);
    });
  });

  describe("balance bar", () => {
    it("renders balance bar when aggregation data is present", () => {
      const { container } = renderNode(
        makeNodeData({
          aggregation: {
            tailwindTotal: 120,
            headwindTotal: 60,
            balanceRatio: 0.67,
          },
        }),
      );
      // The balance bar renders two colored segments inside a rounded container
      const barSegments = container.querySelectorAll("[class*='transition-all']");
      expect(barSegments).toHaveLength(2);
    });

    it("does not render balance bar when aggregation is null", () => {
      const { container } = renderNode(
        makeNodeData({ aggregation: null }),
      );
      const barSegments = container.querySelectorAll("[class*='transition-all']");
      expect(barSegments).toHaveLength(0);
    });

    it("shows correct proportions based on balance ratio", () => {
      const { container } = renderNode(
        makeNodeData({
          aggregation: {
            tailwindTotal: 80,
            headwindTotal: 20,
            balanceRatio: 0.8,
          },
        }),
      );
      const barSegments = container.querySelectorAll("[class*='transition-all']");
      expect(barSegments[0]).toHaveStyle({ width: "80%" });
      expect(barSegments[1]).toHaveStyle({ width: "20%" });
    });
  });

  describe("source count badge", () => {
    it("shows source badge when node has source attachments", () => {
      renderNode(
        makeNodeData({
          attachments: [
            { id: "a1", type: "source" },
            { id: "a2", type: "source" },
            { id: "a3", type: "note" },
          ],
        }),
      );
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByTitle("2 sources")).toBeInTheDocument();
    });

    it("does not show source badge when no source attachments", () => {
      renderNode(
        makeNodeData({
          attachments: [{ id: "a1", type: "note" }],
        }),
      );
      expect(screen.queryByTitle(/source/)).not.toBeInTheDocument();
    });

    it("does not show source badge when no attachments", () => {
      renderNode(makeNodeData({ attachments: [] }));
      expect(screen.queryByTitle(/source/)).not.toBeInTheDocument();
    });

    it("shows singular 'source' in tooltip for count of 1", () => {
      renderNode(
        makeNodeData({
          attachments: [{ id: "a1", type: "source" }],
        }),
      );
      expect(screen.getByTitle("1 source")).toBeInTheDocument();
    });

    it("caps display at 99+ for 100 or more sources", () => {
      const attachments = Array.from({ length: 100 }, (_, i) => ({
        id: `a${i}`,
        type: "source",
      }));
      renderNode(makeNodeData({ attachments }));
      expect(screen.getByText("99+")).toBeInTheDocument();
    });

    it("clicking source badge selects node and opens side panel to attachments", async () => {
      const { user } = renderNode(
        makeNodeData({
          id: "test-node",
          attachments: [{ id: "a1", type: "source" }],
        }),
      );

      const badge = screen.getByTitle("1 source");
      await user.click(badge);

      const state = useUIStore.getState();
      expect(state.selectedNodeId).toBe("test-node");
      expect(state.sidePanelOpen).toBe(true);
      expect(state.sidePanelScrollTarget).toBe("attachments");
    });
  });
});
