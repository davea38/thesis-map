import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { httpBatchLink } from "@trpc/client";
import { MapToolbar } from "./map-toolbar";

function renderToolbar(props: { mapId?: string; mapName?: string; onDeleteRequest?: () => void } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const trpcClient = trpc.createClient({
    links: [httpBatchLink({ url: "http://localhost:4000/trpc" })],
  });

  const user = userEvent.setup();

  const result = render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/map/test-id"]}>
          <MapToolbar
            mapId={props.mapId ?? "test-map-id"}
            mapName={props.mapName ?? "My Test Map"}
            onDeleteRequest={props.onDeleteRequest}
          />
        </MemoryRouter>
      </QueryClientProvider>
    </trpc.Provider>,
  );

  return { ...result, user, queryClient };
}

describe("MapToolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the toolbar with map name", () => {
    renderToolbar({ mapName: "Climate Change Analysis" });
    expect(screen.getByTestId("map-toolbar")).toBeInTheDocument();
    expect(screen.getByText("Climate Change Analysis")).toBeInTheDocument();
  });

  it("renders a back link to the landing page", () => {
    renderToolbar();
    const backLink = screen.getByTestId("back-link");
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/");
    expect(backLink).toHaveAttribute("aria-label", "Back to maps");
  });

  it("renders the save indicator", () => {
    renderToolbar();
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("displays map name as a clickable button when not editing", () => {
    renderToolbar({ mapName: "Test Map" });
    const nameDisplay = screen.getByTestId("map-name-display");
    expect(nameDisplay).toBeInTheDocument();
    expect(nameDisplay.tagName).toBe("BUTTON");
    expect(nameDisplay).toHaveTextContent("Test Map");
  });

  it("shows (untitled) when map name is empty", () => {
    renderToolbar({ mapName: "" });
    expect(screen.getByText("(untitled)")).toBeInTheDocument();
  });

  it("enters edit mode when name is clicked", async () => {
    const { user } = renderToolbar({ mapName: "Test Map" });
    await user.click(screen.getByTestId("map-name-display"));
    const input = screen.getByTestId("map-name-input");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("Test Map");
  });

  it("exits edit mode on blur", async () => {
    const { user } = renderToolbar({ mapName: "Test Map" });
    await user.click(screen.getByTestId("map-name-display"));
    expect(screen.getByTestId("map-name-input")).toBeInTheDocument();

    // Click outside (blur)
    await user.tab();

    await waitFor(() => {
      expect(screen.getByTestId("map-name-display")).toBeInTheDocument();
    });
  });

  it("exits edit mode on Enter", async () => {
    const { user } = renderToolbar({ mapName: "Test Map" });
    await user.click(screen.getByTestId("map-name-display"));
    expect(screen.getByTestId("map-name-input")).toBeInTheDocument();

    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByTestId("map-name-display")).toBeInTheDocument();
    });
  });

  it("cancels editing and reverts on Escape", async () => {
    const { user } = renderToolbar({ mapName: "Original Name" });
    await user.click(screen.getByTestId("map-name-display"));

    const input = screen.getByTestId("map-name-input");
    await user.clear(input);
    await user.type(input, "Changed Name");
    expect(input).toHaveValue("Changed Name");

    await user.keyboard("{Escape}");

    await waitFor(() => {
      const display = screen.getByTestId("map-name-display");
      expect(display).toHaveTextContent("Original Name");
    });
  });

  it("reverts to server name on blur if field is empty", async () => {
    const { user } = renderToolbar({ mapName: "Server Name" });
    await user.click(screen.getByTestId("map-name-display"));

    const input = screen.getByTestId("map-name-input");
    await user.clear(input);

    await user.tab();

    await waitFor(() => {
      const display = screen.getByTestId("map-name-display");
      expect(display).toHaveTextContent("Server Name");
    });
  });

  it("allows typing in the name input", async () => {
    const { user } = renderToolbar({ mapName: "Test" });
    await user.click(screen.getByTestId("map-name-display"));

    const input = screen.getByTestId("map-name-input");
    await user.clear(input);
    await user.type(input, "New Name");
    expect(input).toHaveValue("New Name");
  });

  it("updates name when props change", async () => {
    const { rerender } = renderToolbar({ mapName: "First Name" });
    expect(screen.getByText("First Name")).toBeInTheDocument();

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const trpcClient = trpc.createClient({
      links: [httpBatchLink({ url: "http://localhost:4000/trpc" })],
    });

    rerender(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/map/test-id"]}>
            <MapToolbar mapId="test-map-id" mapName="Updated Name" />
          </MemoryRouter>
        </QueryClientProvider>
      </trpc.Provider>,
    );

    expect(screen.getByText("Updated Name")).toBeInTheDocument();
  });

  describe("delete map button", () => {
    it("renders delete button when onDeleteRequest is provided", () => {
      renderToolbar({ onDeleteRequest: vi.fn() });
      const deleteButton = screen.getByTestId("delete-map-button");
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toHaveAttribute("aria-label", "Delete map");
    });

    it("does not render delete button when onDeleteRequest is not provided", () => {
      renderToolbar();
      expect(screen.queryByTestId("delete-map-button")).not.toBeInTheDocument();
    });

    it("calls onDeleteRequest when delete button is clicked", async () => {
      const onDeleteRequest = vi.fn();
      const { user } = renderToolbar({ onDeleteRequest });
      await user.click(screen.getByTestId("delete-map-button"));
      expect(onDeleteRequest).toHaveBeenCalledTimes(1);
    });
  });
});
