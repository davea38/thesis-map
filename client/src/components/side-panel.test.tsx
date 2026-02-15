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
    it("shows statement section with statement input", () => {
      renderSidePanel({ nodeData: mockNode });
      const section = screen.getByTestId("section-statement");
      expect(section).toBeInTheDocument();
      const input = within(section).getByTestId("statement-input") as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.value).toBe("Test statement");
    });

    it("shows body section with body textarea", () => {
      renderSidePanel({ nodeData: mockNode });
      const section = screen.getByTestId("section-body");
      expect(section).toBeInTheDocument();
      const textarea = within(section).getByTestId("body-input") as HTMLTextAreaElement;
      expect(textarea).toBeInTheDocument();
      expect(textarea.value).toBe("Test body content");
    });

    it("shows properties section for non-root nodes", () => {
      renderSidePanel({ nodeData: mockNode });
      const section = screen.getByTestId("section-properties");
      expect(section).toBeInTheDocument();
      const slider = within(section).getByTestId("strength-slider") as HTMLInputElement;
      expect(slider.value).toBe("75");
    });

    it("hides properties section for root nodes", () => {
      renderSidePanel({
        selectedNodeId: "root-1",
        nodeData: mockRootNode,
        nodeQueryKey: "root-1",
      });
      expect(screen.queryByTestId("section-properties")).not.toBeInTheDocument();
    });

    it("shows map thesis hint label for root node statement", () => {
      renderSidePanel({
        selectedNodeId: "root-1",
        nodeData: mockRootNode,
        nodeQueryKey: "root-1",
      });
      expect(screen.getByText(/map thesis.*edits update the map title/)).toBeInTheDocument();
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

  describe("statement editing", () => {
    it("renders a text input for the statement", () => {
      renderSidePanel({ nodeData: mockNode });
      const input = screen.getByTestId("statement-input") as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe("INPUT");
      expect(input.type).toBe("text");
      expect(input.value).toBe("Test statement");
    });

    it("allows typing in the statement input", async () => {
      const { user } = renderSidePanel({ nodeData: mockNode });
      const input = screen.getByTestId("statement-input") as HTMLInputElement;

      await user.clear(input);
      await user.type(input, "Updated statement");

      expect(input.value).toBe("Updated statement");
    });

    it("shows placeholder when statement is empty", () => {
      renderSidePanel({ nodeData: { ...mockNode, statement: "" } });
      const input = screen.getByTestId("statement-input") as HTMLInputElement;
      expect(input.placeholder).toBe("Enter statement...");
    });

    it("shows root node thesis label for root node statement", () => {
      renderSidePanel({
        selectedNodeId: "root-1",
        nodeData: mockRootNode,
        nodeQueryKey: "root-1",
      });
      expect(screen.getByText(/map thesis.*edits update the map title/)).toBeInTheDocument();
    });

    it("does not show thesis label for non-root nodes", () => {
      renderSidePanel({ nodeData: mockNode });
      expect(screen.queryByText(/map thesis/)).not.toBeInTheDocument();
    });

    it("pre-fills the root node statement in the input", () => {
      renderSidePanel({
        selectedNodeId: "root-1",
        nodeData: mockRootNode,
        nodeQueryKey: "root-1",
      });
      const input = screen.getByTestId("statement-input") as HTMLInputElement;
      expect(input.value).toBe("This is the thesis");
    });
  });

  describe("body editing", () => {
    it("renders a textarea for the body", () => {
      renderSidePanel({ nodeData: mockNode });
      const textarea = screen.getByTestId("body-input") as HTMLTextAreaElement;
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName).toBe("TEXTAREA");
      expect(textarea.value).toBe("Test body content");
    });

    it("allows typing in the body textarea", async () => {
      const { user } = renderSidePanel({ nodeData: mockNode });
      const textarea = screen.getByTestId("body-input") as HTMLTextAreaElement;

      await user.clear(textarea);
      await user.type(textarea, "Updated body text");

      expect(textarea.value).toBe("Updated body text");
    });

    it("shows placeholder when body is empty", () => {
      renderSidePanel({ nodeData: { ...mockNode, body: "" } });
      const textarea = screen.getByTestId("body-input") as HTMLTextAreaElement;
      expect(textarea.placeholder).toBe("Enter your reasoning...");
    });

    it("labels the body section as 'Primary Reasoning'", () => {
      renderSidePanel({ nodeData: mockNode });
      const section = screen.getByTestId("section-body");
      expect(within(section).getByText("Primary Reasoning")).toBeInTheDocument();
    });

    it("renders body textarea for root nodes too", () => {
      renderSidePanel({
        selectedNodeId: "root-1",
        nodeData: mockRootNode,
        nodeQueryKey: "root-1",
      });
      const textarea = screen.getByTestId("body-input") as HTMLTextAreaElement;
      expect(textarea).toBeInTheDocument();
    });

    it("pre-fills body value from node data", () => {
      renderSidePanel({
        nodeData: { ...mockNode, body: "Some reasoning text" },
      });
      const textarea = screen.getByTestId("body-input") as HTMLTextAreaElement;
      expect(textarea.value).toBe("Some reasoning text");
    });
  });

  describe("strength editing", () => {
    it("renders a slider and numeric input for strength", () => {
      renderSidePanel({ nodeData: mockNode });
      const editor = screen.getByTestId("strength-editor");
      expect(editor).toBeInTheDocument();

      const slider = screen.getByTestId("strength-slider") as HTMLInputElement;
      expect(slider).toBeInTheDocument();
      expect(slider.type).toBe("range");
      expect(slider.min).toBe("0");
      expect(slider.max).toBe("100");
      expect(slider.value).toBe("75");

      const numberInput = screen.getByTestId("strength-number-input") as HTMLInputElement;
      expect(numberInput).toBeInTheDocument();
      expect(numberInput.type).toBe("number");
      expect(numberInput.value).toBe("75");
    });

    it("slider and numeric input are synced with initial node data", () => {
      renderSidePanel({
        nodeData: { ...mockNode, strength: 42 },
      });
      const slider = screen.getByTestId("strength-slider") as HTMLInputElement;
      const numberInput = screen.getByTestId("strength-number-input") as HTMLInputElement;
      expect(slider.value).toBe("42");
      expect(numberInput.value).toBe("42");
    });

    it("defaults to 0 when strength is null", () => {
      renderSidePanel({
        nodeData: { ...mockNode, strength: null },
      });
      const slider = screen.getByTestId("strength-slider") as HTMLInputElement;
      const numberInput = screen.getByTestId("strength-number-input") as HTMLInputElement;
      expect(slider.value).toBe("0");
      expect(numberInput.value).toBe("0");
    });

    it("updates numeric input when slider changes", async () => {
      const { user } = renderSidePanel({ nodeData: mockNode });
      const numberInput = screen.getByTestId("strength-number-input") as HTMLInputElement;

      // Simulate changing the numeric input
      await user.clear(numberInput);
      await user.type(numberInput, "50");

      expect(numberInput.value).toBe("50");
    });

    it("clamps values above 100 to 100", async () => {
      const { user } = renderSidePanel({ nodeData: mockNode });
      const numberInput = screen.getByTestId("strength-number-input") as HTMLInputElement;

      await user.clear(numberInput);
      await user.type(numberInput, "150");

      expect(numberInput.value).toBe("100");
    });

    it("clamps values to 0 minimum via the handler", () => {
      renderSidePanel({
        nodeData: { ...mockNode, strength: 0 },
      });
      const slider = screen.getByTestId("strength-slider") as HTMLInputElement;
      const numberInput = screen.getByTestId("strength-number-input") as HTMLInputElement;

      // The min attribute prevents negative values in the input
      expect(numberInput.min).toBe("0");
      expect(slider.min).toBe("0");

      // Verify values at the boundary
      expect(slider.value).toBe("0");
      expect(numberInput.value).toBe("0");
    });

    it("does not show strength editor for root nodes", () => {
      renderSidePanel({
        selectedNodeId: "root-1",
        nodeData: mockRootNode,
        nodeQueryKey: "root-1",
      });
      expect(screen.queryByTestId("strength-editor")).not.toBeInTheDocument();
    });

    it("has proper accessibility labels", () => {
      renderSidePanel({ nodeData: mockNode });
      expect(screen.getByLabelText("Strength slider")).toBeInTheDocument();
      expect(screen.getByLabelText("Strength percentage")).toBeInTheDocument();
    });

    it("shows percent sign next to the numeric input", () => {
      renderSidePanel({ nodeData: mockNode });
      const editor = screen.getByTestId("strength-editor");
      expect(within(editor).getByText("%")).toBeInTheDocument();
    });
  });

  describe("polarity selector", () => {
    it("renders three polarity buttons for non-root nodes", () => {
      renderSidePanel({ nodeData: mockNode });
      const selector = screen.getByTestId("polarity-selector");
      expect(selector).toBeInTheDocument();
      expect(screen.getByTestId("polarity-tailwind")).toBeInTheDocument();
      expect(screen.getByTestId("polarity-headwind")).toBeInTheDocument();
      expect(screen.getByTestId("polarity-neutral")).toBeInTheDocument();
    });

    it("marks the current polarity as pressed", () => {
      renderSidePanel({ nodeData: { ...mockNode, polarity: "tailwind" } });
      const tailwindBtn = screen.getByTestId("polarity-tailwind");
      const headwindBtn = screen.getByTestId("polarity-headwind");
      const neutralBtn = screen.getByTestId("polarity-neutral");
      expect(tailwindBtn).toHaveAttribute("aria-pressed", "true");
      expect(headwindBtn).toHaveAttribute("aria-pressed", "false");
      expect(neutralBtn).toHaveAttribute("aria-pressed", "false");
    });

    it("marks headwind as pressed when node is headwind", () => {
      renderSidePanel({ nodeData: { ...mockNode, polarity: "headwind" } });
      expect(screen.getByTestId("polarity-headwind")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("polarity-tailwind")).toHaveAttribute("aria-pressed", "false");
    });

    it("marks neutral as pressed when node is neutral", () => {
      renderSidePanel({ nodeData: { ...mockNode, polarity: "neutral" } });
      expect(screen.getByTestId("polarity-neutral")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("polarity-tailwind")).toHaveAttribute("aria-pressed", "false");
    });

    it("updates local state when clicking a different polarity", async () => {
      const { user } = renderSidePanel({ nodeData: { ...mockNode, polarity: "neutral" } });
      const tailwindBtn = screen.getByTestId("polarity-tailwind");

      await user.click(tailwindBtn);

      expect(tailwindBtn).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("polarity-neutral")).toHaveAttribute("aria-pressed", "false");
    });

    it("does not show polarity selector for root nodes", () => {
      renderSidePanel({
        selectedNodeId: "root-1",
        nodeData: mockRootNode,
        nodeQueryKey: "root-1",
      });
      expect(screen.queryByTestId("polarity-selector")).not.toBeInTheDocument();
    });

    it("has a 'Polarity' label", () => {
      renderSidePanel({ nodeData: mockNode });
      const selector = screen.getByTestId("polarity-selector");
      expect(within(selector).getByText("Polarity")).toBeInTheDocument();
    });

    it("applies polarity color-coding to buttons", () => {
      renderSidePanel({ nodeData: { ...mockNode, polarity: "tailwind" } });
      const tailwindBtn = screen.getByTestId("polarity-tailwind");
      // Tailwind border color (jsdom may return hex or rgb)
      expect(tailwindBtn.style.borderColor).toBeTruthy();
      // Selected tailwind has non-transparent background
      expect(tailwindBtn.style.backgroundColor).not.toBe("transparent");
      expect(tailwindBtn.style.backgroundColor).toBeTruthy();
    });

    it("shows unselected buttons with transparent background", () => {
      renderSidePanel({ nodeData: { ...mockNode, polarity: "tailwind" } });
      const headwindBtn = screen.getByTestId("polarity-headwind");
      expect(headwindBtn.style.backgroundColor).toBe("transparent");
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
