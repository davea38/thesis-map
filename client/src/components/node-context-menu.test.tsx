import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "@/lib/trpc";
import { NodeContextMenu } from "./node-context-menu";
import { useUIStore } from "@/stores/ui-store";

const mockNodes = new Map([
  [
    "node-1",
    {
      id: "node-1",
      parentId: "root-1",
      tags: [
        { id: "t1", name: "Economic", color: "#3b82f6" },
        { id: "t2", name: "Social", color: "#22c55e" },
      ],
    },
  ],
  [
    "root-1",
    {
      id: "root-1",
      parentId: null,
      tags: [],
    },
  ],
  [
    "leaf-1",
    {
      id: "leaf-1",
      parentId: "node-1",
      tags: [],
    },
  ],
]);

function renderContextMenu(options?: {
  contextMenuState?: { x: number; y: number; nodeId: string } | null;
  onDeleteRequest?: (nodeId: string) => void;
}) {
  const {
    contextMenuState = { x: 100, y: 200, nodeId: "node-1" },
    onDeleteRequest = vi.fn(),
  } = options ?? {};

  useUIStore.setState({ contextMenuState });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  // Pre-populate tag list
  queryClient.setQueryData(
    [["tag", "list"], { input: { mapId: "map-1" }, type: "query" }],
    [
      { id: "t1", mapId: "map-1", name: "Economic", color: "#3b82f6", nodeCount: 2 },
      { id: "t2", mapId: "map-1", name: "Social", color: "#22c55e", nodeCount: 1 },
      { id: "t3", mapId: "map-1", name: "Legal", color: "#f59e0b", nodeCount: 0 },
    ],
  );

  const trpcClient = trpc.createClient({
    links: [httpBatchLink({ url: "http://localhost:4000/trpc" })],
  });

  const user = userEvent.setup();

  const result = render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <NodeContextMenu
          mapId="map-1"
          nodes={mockNodes}
          onDeleteRequest={onDeleteRequest}
        />
      </QueryClientProvider>
    </trpc.Provider>,
  );

  return { ...result, user, onDeleteRequest };
}

beforeEach(() => {
  useUIStore.setState({
    selectedNodeId: null,
    sidePanelOpen: false,
    sidePanelScrollTarget: null,
    contextMenuState: null,
    inlineEditNodeId: null,
  });
});

describe("NodeContextMenu", () => {
  describe("visibility", () => {
    it("renders when contextMenuState is set", () => {
      renderContextMenu();
      expect(screen.getByTestId("node-context-menu")).toBeInTheDocument();
    });

    it("does not render when contextMenuState is null", () => {
      renderContextMenu({ contextMenuState: null });
      expect(screen.queryByTestId("node-context-menu")).not.toBeInTheDocument();
    });

    it("positions the menu at the cursor coordinates", () => {
      renderContextMenu({
        contextMenuState: { x: 150, y: 250, nodeId: "node-1" },
      });
      const menu = screen.getByTestId("node-context-menu");
      expect(menu.style.left).toBe("150px");
      expect(menu.style.top).toBe("250px");
    });
  });

  describe("menu items for non-root node", () => {
    it("shows Add child button", () => {
      renderContextMenu();
      expect(screen.getByTestId("ctx-add-child")).toBeInTheDocument();
      expect(screen.getByTestId("ctx-add-child")).toHaveTextContent("Add child");
    });

    it("shows Delete button (not Delete map)", () => {
      renderContextMenu();
      expect(screen.getByTestId("ctx-delete")).toBeInTheDocument();
      expect(screen.getByTestId("ctx-delete")).toHaveTextContent("Delete");
      expect(screen.queryByTestId("ctx-delete-map")).not.toBeInTheDocument();
    });

    it("shows Set polarity button for non-root", () => {
      renderContextMenu();
      expect(screen.getByTestId("ctx-set-polarity")).toBeInTheDocument();
    });

    it("shows Add tag button", () => {
      renderContextMenu();
      expect(screen.getByTestId("ctx-add-tag")).toBeInTheDocument();
    });

    it("shows Remove tag button when node has tags", () => {
      renderContextMenu();
      expect(screen.getByTestId("ctx-remove-tag")).toBeInTheDocument();
    });

    it("does not show Remove tag button when node has no tags", () => {
      renderContextMenu({
        contextMenuState: { x: 100, y: 200, nodeId: "leaf-1" },
      });
      expect(screen.queryByTestId("ctx-remove-tag")).not.toBeInTheDocument();
    });
  });

  describe("menu items for root node", () => {
    it("shows Delete map instead of Delete", () => {
      renderContextMenu({
        contextMenuState: { x: 100, y: 200, nodeId: "root-1" },
      });
      expect(screen.getByTestId("ctx-delete-map")).toBeInTheDocument();
      expect(screen.getByTestId("ctx-delete-map")).toHaveTextContent("Delete map");
      expect(screen.queryByTestId("ctx-delete")).not.toBeInTheDocument();
    });

    it("hides Set polarity for root node", () => {
      renderContextMenu({
        contextMenuState: { x: 100, y: 200, nodeId: "root-1" },
      });
      expect(screen.queryByTestId("ctx-set-polarity")).not.toBeInTheDocument();
    });

    it("still shows Add child for root node", () => {
      renderContextMenu({
        contextMenuState: { x: 100, y: 200, nodeId: "root-1" },
      });
      expect(screen.getByTestId("ctx-add-child")).toBeInTheDocument();
    });
  });

  describe("delete action", () => {
    it("calls onDeleteRequest when Delete is clicked", async () => {
      const onDeleteRequest = vi.fn();
      const { user } = renderContextMenu({ onDeleteRequest });

      await user.click(screen.getByTestId("ctx-delete"));
      expect(onDeleteRequest).toHaveBeenCalledWith("node-1");
    });

    it("closes the context menu after delete click", async () => {
      const { user } = renderContextMenu();

      await user.click(screen.getByTestId("ctx-delete"));
      expect(useUIStore.getState().contextMenuState).toBeNull();
    });
  });

  describe("polarity submenu", () => {
    it("opens polarity submenu on click", async () => {
      const { user } = renderContextMenu();

      await user.click(screen.getByTestId("ctx-set-polarity"));
      expect(screen.getByTestId("ctx-polarity-submenu")).toBeInTheDocument();
      expect(screen.getByTestId("ctx-polarity-tailwind")).toHaveTextContent("Tailwind");
      expect(screen.getByTestId("ctx-polarity-headwind")).toHaveTextContent("Headwind");
      expect(screen.getByTestId("ctx-polarity-neutral")).toHaveTextContent("Neutral");
    });

    it("toggles polarity submenu off on second click", async () => {
      const { user } = renderContextMenu();

      await user.click(screen.getByTestId("ctx-set-polarity"));
      expect(screen.getByTestId("ctx-polarity-submenu")).toBeInTheDocument();

      await user.click(screen.getByTestId("ctx-set-polarity"));
      expect(screen.queryByTestId("ctx-polarity-submenu")).not.toBeInTheDocument();
    });
  });

  describe("add tag submenu", () => {
    it("opens add tag submenu on click", async () => {
      const { user } = renderContextMenu();

      await user.click(screen.getByTestId("ctx-add-tag"));
      expect(screen.getByTestId("ctx-add-tag-submenu")).toBeInTheDocument();
    });

    it("shows only tags not already on the node", async () => {
      const { user } = renderContextMenu();

      await user.click(screen.getByTestId("ctx-add-tag"));
      const submenu = screen.getByTestId("ctx-add-tag-submenu");

      // node-1 already has t1 (Economic) and t2 (Social), so only t3 (Legal) should show
      expect(within(submenu).queryByText("Economic")).not.toBeInTheDocument();
      expect(within(submenu).queryByText("Social")).not.toBeInTheDocument();
      expect(within(submenu).getByText("Legal")).toBeInTheDocument();
    });

    it("shows new tag creation form", async () => {
      const { user } = renderContextMenu();

      await user.click(screen.getByTestId("ctx-add-tag"));
      expect(screen.getByTestId("ctx-new-tag-name")).toBeInTheDocument();
      expect(screen.getByTestId("ctx-new-tag-create")).toBeInTheDocument();
    });

    it("shows error when trying to create tag with empty name", async () => {
      const { user } = renderContextMenu();

      await user.click(screen.getByTestId("ctx-add-tag"));
      await user.click(screen.getByTestId("ctx-new-tag-create"));

      expect(screen.getByTestId("ctx-new-tag-error")).toHaveTextContent("Tag name is required");
    });

    it("shows color palette for new tag", async () => {
      const { user } = renderContextMenu();

      await user.click(screen.getByTestId("ctx-add-tag"));
      // Check that at least a few color buttons exist
      expect(screen.getByTestId("ctx-new-tag-color-#ef4444")).toBeInTheDocument();
      expect(screen.getByTestId("ctx-new-tag-color-#3b82f6")).toBeInTheDocument();
    });
  });

  describe("remove tag submenu", () => {
    it("opens remove tag submenu on click", async () => {
      const { user } = renderContextMenu();

      await user.click(screen.getByTestId("ctx-remove-tag"));
      expect(screen.getByTestId("ctx-remove-tag-submenu")).toBeInTheDocument();
    });

    it("shows tags currently on the node", async () => {
      const { user } = renderContextMenu();

      await user.click(screen.getByTestId("ctx-remove-tag"));
      const submenu = screen.getByTestId("ctx-remove-tag-submenu");

      expect(within(submenu).getByText("Economic")).toBeInTheDocument();
      expect(within(submenu).getByText("Social")).toBeInTheDocument();
    });
  });

  describe("close behavior", () => {
    it("closes when Escape is pressed", async () => {
      const { user } = renderContextMenu();

      expect(screen.getByTestId("node-context-menu")).toBeInTheDocument();

      // Escape should trigger close
      await user.keyboard("{Escape}");
      expect(useUIStore.getState().contextMenuState).toBeNull();
    });
  });
});
