import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { httpBatchLink } from "@trpc/client";
import { SidePanel } from "./side-panel";
import { useUIStore } from "@/stores/ui-store";

const mockNode = {
  id: "node-1",
  mapId: "map-1",
  parentId: "parent-1" as string | null,
  statement: "Test statement",
  body: "Test body content",
  strength: 75 as number | null,
  polarity: "tailwind" as string | null,
  orderIndex: 0,
  createdAt: "2025-01-10T10:00:00Z",
  updatedAt: "2025-01-15T11:00:00Z",
  tags: [
    { id: "t1", name: "Economic", color: "#3b82f6" },
  ],
  attachments: [
    { id: "a1", type: "source", url: "https://example.com", noteText: null },
    { id: "a2", type: "note", url: null, noteText: "A note" },
  ],
  aggregation: null as { tailwindTotal: number; headwindTotal: number; balanceRatio: number } | null,
  children: [] as unknown[],
  nodeTags: [{ tag: { id: "t1", name: "Economic", color: "#3b82f6" } }],
};

const mockRootNode = {
  ...mockNode,
  id: "root-1",
  parentId: null,
  statement: "This is the thesis",
  polarity: null,
  strength: null,
  tags: [],
  attachments: [],
  children: [],
  nodeTags: [],
};

const mockNodeWithAggregation = {
  ...mockNode,
  id: "node-agg",
  aggregation: {
    tailwindTotal: 120,
    headwindTotal: 60,
    balanceRatio: 0.67,
  },
};

function renderSidePanel(options?: {
  selectedNodeId?: string | null;
  sidePanelOpen?: boolean;
  sidePanelScrollTarget?: string | null;
  nodeData?: typeof mockNode | null;
  nodeQueryKey?: string;
}) {
  const {
    selectedNodeId = "node-1",
    sidePanelOpen = true,
    sidePanelScrollTarget = null,
    nodeData = mockNode,
    nodeQueryKey = selectedNodeId,
  } = options ?? {};

  // Set Zustand state
  useUIStore.setState({
    selectedNodeId,
    sidePanelOpen,
    sidePanelScrollTarget,
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  // Pre-populate node.getById cache
  if (nodeData && nodeQueryKey) {
    queryClient.setQueryData(
      [["node", "getById"], { input: { id: nodeQueryKey }, type: "query" }],
      nodeData,
    );
  }

  const trpcClient = trpc.createClient({
    links: [httpBatchLink({ url: "http://localhost:4000/trpc" })],
  });

  const user = userEvent.setup();

  const result = render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <SidePanel />
      </QueryClientProvider>
    </trpc.Provider>,
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

describe("SidePanel", () => {
  describe("visibility", () => {
    it("renders when sidePanelOpen is true and selectedNodeId is set", () => {
      renderSidePanel({ selectedNodeId: "node-1", sidePanelOpen: true });
      expect(screen.getByTestId("side-panel")).toBeInTheDocument();
    });

    it("does not render when sidePanelOpen is false", () => {
      renderSidePanel({ selectedNodeId: "node-1", sidePanelOpen: false });
      expect(screen.queryByTestId("side-panel")).not.toBeInTheDocument();
    });

    it("does not render when selectedNodeId is null", () => {
      renderSidePanel({ selectedNodeId: null, sidePanelOpen: true });
      expect(screen.queryByTestId("side-panel")).not.toBeInTheDocument();
    });
  });

  describe("close button", () => {
    it("renders a close button with aria-label", () => {
      renderSidePanel();
      expect(screen.getByLabelText("Close side panel")).toBeInTheDocument();
    });

    it("closes the panel when close button is clicked", async () => {
      const { user } = renderSidePanel();

      await user.click(screen.getByLabelText("Close side panel"));

      const state = useUIStore.getState();
      expect(state.sidePanelOpen).toBe(false);
    });
  });

  describe("node data display", () => {
    it("shows statement section with statement text", () => {
      renderSidePanel({ nodeData: mockNode });
      const section = screen.getByTestId("section-statement");
      expect(section).toBeInTheDocument();
      expect(within(section).getByText("Test statement")).toBeInTheDocument();
    });

    it("shows body section", () => {
      renderSidePanel({ nodeData: mockNode });
      expect(screen.getByTestId("section-body")).toBeInTheDocument();
      expect(screen.getByText("Test body content")).toBeInTheDocument();
    });

    it("shows properties section for non-root nodes", () => {
      renderSidePanel({ nodeData: mockNode });
      const section = screen.getByTestId("section-properties");
      expect(section).toBeInTheDocument();
      expect(within(section).getByText("75%")).toBeInTheDocument();
    });

    it("hides properties section for root nodes", () => {
      renderSidePanel({
        selectedNodeId: "root-1",
        nodeData: mockRootNode,
        nodeQueryKey: "root-1",
      });
      expect(screen.queryByTestId("section-properties")).not.toBeInTheDocument();
    });

    it("shows '(map thesis)' label for root node statement", () => {
      renderSidePanel({
        selectedNodeId: "root-1",
        nodeData: mockRootNode,
        nodeQueryKey: "root-1",
      });
      expect(screen.getByText("(map thesis)")).toBeInTheDocument();
    });

    it("shows tags section with tag chips", () => {
      renderSidePanel({ nodeData: mockNode });
      expect(screen.getByTestId("section-tags")).toBeInTheDocument();
      expect(screen.getByText("Economic")).toBeInTheDocument();
    });

    it("shows 'No tags.' when node has no tags", () => {
      renderSidePanel({
        nodeData: { ...mockNode, tags: [] },
      });
      expect(screen.getByText("No tags.")).toBeInTheDocument();
    });

    it("shows attachments section with attachment list", () => {
      renderSidePanel({ nodeData: mockNode });
      expect(screen.getByTestId("section-attachments")).toBeInTheDocument();
      expect(screen.getByText("https://example.com")).toBeInTheDocument();
      expect(screen.getByText("A note")).toBeInTheDocument();
    });

    it("shows 'No attachments.' when node has no attachments", () => {
      renderSidePanel({
        nodeData: { ...mockNode, attachments: [] },
      });
      expect(screen.getByText("No attachments.")).toBeInTheDocument();
    });
  });

  describe("aggregation section", () => {
    it("shows aggregation section when node has aggregation data", () => {
      renderSidePanel({
        selectedNodeId: "node-agg",
        nodeData: mockNodeWithAggregation,
        nodeQueryKey: "node-agg",
      });
      expect(screen.getByTestId("section-aggregation")).toBeInTheDocument();
      expect(screen.getByText("Tailwind: 120")).toBeInTheDocument();
      expect(screen.getByText("Headwind: 60")).toBeInTheDocument();
      expect(screen.getByText("67%")).toBeInTheDocument();
    });

    it("does not show aggregation section when aggregation is null", () => {
      renderSidePanel({ nodeData: mockNode });
      expect(screen.queryByTestId("section-aggregation")).not.toBeInTheDocument();
    });
  });

  describe("header", () => {
    it("shows node statement in header for non-root nodes", () => {
      renderSidePanel({ nodeData: mockNode });
      // Statement appears in header h2 — use getAllByText since it also appears in the body
      const elements = screen.getAllByText("Test statement");
      expect(elements.length).toBeGreaterThanOrEqual(1);
      // The header h2 should contain the statement
      const header = screen.getByRole("heading", { level: 2 });
      expect(header).toHaveTextContent("Test statement");
    });

    it("shows 'Root Node' in header for root nodes", () => {
      renderSidePanel({
        selectedNodeId: "root-1",
        nodeData: mockRootNode,
        nodeQueryKey: "root-1",
      });
      expect(screen.getByText("Root Node")).toBeInTheDocument();
    });

    it("shows polarity color indicator dot", () => {
      const { container } = renderSidePanel({ nodeData: mockNode });
      const colorDot = container.querySelector("[style*='background-color']");
      expect(colorDot).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows loading skeleton when node data is loading", () => {
      // Don't pre-populate cache so the query stays in loading state
      renderSidePanel({ nodeData: null, nodeQueryKey: undefined });
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("responsive layout", () => {
    it("has md: classes for desktop right-side overlay", () => {
      renderSidePanel();
      const panel = screen.getByTestId("side-panel");
      expect(panel.className).toContain("md:right-0");
      expect(panel.className).toContain("md:w-96");
    });

    it("has max-md: classes for mobile bottom sheet", () => {
      renderSidePanel();
      const panel = screen.getByTestId("side-panel");
      expect(panel.className).toContain("max-md:bottom-0");
      expect(panel.className).toContain("max-md:rounded-t-2xl");
    });

    it("renders mobile drag handle indicator", () => {
      const { container } = renderSidePanel();
      // The drag handle is an element hidden on md+ screens
      const handle = container.querySelector(".md\\:hidden");
      expect(handle).toBeInTheDocument();
    });
  });
});
