import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { httpBatchLink } from "@trpc/client";
import { TagFilterPanel } from "./tag-filter-panel";
import { useUIStore } from "@/stores/ui-store";

const mockTags = [
  { id: "tag-1", mapId: "map-1", name: "Economic", color: "#3b82f6", nodeCount: 3 },
  { id: "tag-2", mapId: "map-1", name: "Technical", color: "#ef4444", nodeCount: 1 },
  { id: "tag-3", mapId: "map-1", name: "Social", color: "#22c55e", nodeCount: 0 },
];

function renderPanel(options?: { mapId?: string; tags?: typeof mockTags }) {
  const { mapId = "map-1", tags = mockTags } = options ?? {};

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  queryClient.setQueryData(
    [["tag", "list"], { input: { mapId }, type: "query" }],
    tags,
  );

  const trpcClient = trpc.createClient({
    links: [httpBatchLink({ url: "http://localhost:4000/trpc" })],
  });

  const user = userEvent.setup();

  const result = render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TagFilterPanel mapId={mapId} />
        </MemoryRouter>
      </QueryClientProvider>
    </trpc.Provider>,
  );

  return { ...result, user, queryClient };
}

describe("TagFilterPanel", () => {
  beforeEach(() => {
    useUIStore.setState({
      activeTagFilters: new Set<string>(),
    });
  });

  it("renders the filter button", () => {
    renderPanel();
    const button = screen.getByTestId("tag-filter-button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", "Tag filters");
  });

  it("opens the filter panel when clicked", async () => {
    const { user } = renderPanel();
    await user.click(screen.getByTestId("tag-filter-button"));
    expect(screen.getByTestId("tag-filter-panel")).toBeInTheDocument();
    expect(screen.getByText("Filter by tag")).toBeInTheDocument();
  });

  it("closes the filter panel when clicked again", async () => {
    const { user } = renderPanel();
    await user.click(screen.getByTestId("tag-filter-button"));
    expect(screen.getByTestId("tag-filter-panel")).toBeInTheDocument();

    await user.click(screen.getByTestId("tag-filter-button"));
    expect(screen.queryByTestId("tag-filter-panel")).not.toBeInTheDocument();
  });

  it("displays all tags with their names and node counts", async () => {
    const { user } = renderPanel();
    await user.click(screen.getByTestId("tag-filter-button"));

    expect(screen.getByText("Economic")).toBeInTheDocument();
    expect(screen.getByText("3 nodes")).toBeInTheDocument();
    expect(screen.getByText("Technical")).toBeInTheDocument();
    expect(screen.getByText("1 node")).toBeInTheDocument();
    expect(screen.getByText("Social")).toBeInTheDocument();
    expect(screen.getByText("0 nodes")).toBeInTheDocument();
  });

  it("toggles a tag filter when clicked", async () => {
    const { user } = renderPanel();
    await user.click(screen.getByTestId("tag-filter-button"));

    const tagButton = screen.getByTestId("tag-filter-tag-1");
    expect(tagButton).toHaveAttribute("aria-pressed", "false");

    await user.click(tagButton);
    expect(useUIStore.getState().activeTagFilters.has("tag-1")).toBe(true);
  });

  it("shows active state on selected tags", async () => {
    useUIStore.setState({ activeTagFilters: new Set(["tag-1"]) });
    const { user } = renderPanel();
    await user.click(screen.getByTestId("tag-filter-button"));

    const tagButton = screen.getByTestId("tag-filter-tag-1");
    expect(tagButton).toHaveAttribute("aria-pressed", "true");
  });

  it("removes a tag filter when an active tag is clicked", async () => {
    useUIStore.setState({ activeTagFilters: new Set(["tag-1"]) });
    const { user } = renderPanel();
    await user.click(screen.getByTestId("tag-filter-button"));

    await user.click(screen.getByTestId("tag-filter-tag-1"));
    expect(useUIStore.getState().activeTagFilters.has("tag-1")).toBe(false);
  });

  it("shows Clear all button when filters are active", async () => {
    useUIStore.setState({ activeTagFilters: new Set(["tag-1"]) });
    const { user } = renderPanel();
    await user.click(screen.getByTestId("tag-filter-button"));

    expect(screen.getByTestId("clear-tag-filters")).toBeInTheDocument();
  });

  it("does not show Clear all button when no filters are active", async () => {
    const { user } = renderPanel();
    await user.click(screen.getByTestId("tag-filter-button"));

    expect(screen.queryByTestId("clear-tag-filters")).not.toBeInTheDocument();
  });

  it("clears all filters when Clear all is clicked", async () => {
    useUIStore.setState({ activeTagFilters: new Set(["tag-1", "tag-2"]) });
    const { user } = renderPanel();
    await user.click(screen.getByTestId("tag-filter-button"));

    await user.click(screen.getByTestId("clear-tag-filters"));
    expect(useUIStore.getState().activeTagFilters.size).toBe(0);
  });

  it("shows active filter count badge on the button", () => {
    useUIStore.setState({ activeTagFilters: new Set(["tag-1", "tag-2"]) });
    renderPanel();

    const button = screen.getByTestId("tag-filter-button");
    expect(button).toHaveAttribute(
      "aria-label",
      "Tag filters (2 active)",
    );
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("highlights the filter button when filters are active", () => {
    useUIStore.setState({ activeTagFilters: new Set(["tag-1"]) });
    renderPanel();

    const button = screen.getByTestId("tag-filter-button");
    expect(button.className).toContain("text-primary");
  });

  it("shows empty state when no tags exist", async () => {
    const { user } = renderPanel({ tags: [] });
    await user.click(screen.getByTestId("tag-filter-button"));

    expect(screen.getByText("No tags in this map")).toBeInTheDocument();
  });

  it("has correct aria-expanded attribute", async () => {
    const { user } = renderPanel();
    const button = screen.getByTestId("tag-filter-button");

    expect(button).toHaveAttribute("aria-expanded", "false");

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });
});
