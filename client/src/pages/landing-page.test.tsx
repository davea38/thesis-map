import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { httpBatchLink } from "@trpc/client";
import { LandingPage } from "./landing-page";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const trpcClient = trpc.createClient({
    links: [httpBatchLink({ url: "http://localhost:4000/trpc" })],
  });

  return render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/"]}>{ui}</MemoryRouter>
      </QueryClientProvider>
    </trpc.Provider>,
  );
}

describe("LandingPage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the heading", () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getByText("Your Maps")).toBeInTheDocument();
  });

  it("shows loading skeleton initially", () => {
    renderWithProviders(<LandingPage />);
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders map entries when data is provided via React Query", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));

    const mockMaps = [
      {
        id: "map-1",
        name: "Test Map",
        thesisStatement: "Remote work improves productivity",
        createdAt: "2025-01-10T10:00:00Z",
        updatedAt: "2025-01-15T11:00:00Z",
      },
      {
        id: "map-2",
        name: "Another Map",
        thesisStatement: "Climate change requires immediate action",
        createdAt: "2025-01-12T10:00:00Z",
        updatedAt: "2025-01-14T10:00:00Z",
      },
    ];

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    // Pre-populate the React Query cache with mock data
    queryClient.setQueryData(
      [["map", "list"], { type: "query" }],
      mockMaps,
    );

    const trpcClient = trpc.createClient({
      links: [httpBatchLink({ url: "http://localhost:4000/trpc" })],
    });

    render(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/"]}>
            <LandingPage />
          </MemoryRouter>
        </QueryClientProvider>
      </trpc.Provider>,
    );

    expect(screen.getByText("Test Map")).toBeInTheDocument();
    expect(
      screen.getByText("Remote work improves productivity"),
    ).toBeInTheDocument();
    expect(screen.getByText("Another Map")).toBeInTheDocument();
    expect(
      screen.getByText("Climate change requires immediate action"),
    ).toBeInTheDocument();
    expect(screen.getByText("1h ago")).toBeInTheDocument();
    expect(screen.getByText("1d ago")).toBeInTheDocument();
  });

  it("renders empty state when no maps exist", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    queryClient.setQueryData([["map", "list"], { type: "query" }], []);

    const trpcClient = trpc.createClient({
      links: [httpBatchLink({ url: "http://localhost:4000/trpc" })],
    });

    render(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/"]}>
            <LandingPage />
          </MemoryRouter>
        </QueryClientProvider>
      </trpc.Provider>,
    );

    expect(
      screen.getByText(
        "No thesis maps yet. Create one to start structuring your arguments.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Create your first thesis map"),
    ).toBeInTheDocument();
  });

  it("links map entries to /map/:id", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    queryClient.setQueryData([["map", "list"], { type: "query" }], [
      {
        id: "map-abc",
        name: "Linked Map",
        thesisStatement: "Testing links",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    const trpcClient = trpc.createClient({
      links: [httpBatchLink({ url: "http://localhost:4000/trpc" })],
    });

    render(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/"]}>
            <LandingPage />
          </MemoryRouter>
        </QueryClientProvider>
      </trpc.Provider>,
    );

    const link = screen.getByText("Linked Map").closest("a");
    expect(link).toHaveAttribute("href", "/map/map-abc");
  });

  function renderWithMaps(maps: Array<{ id: string; name: string; thesisStatement: string }>) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    queryClient.setQueryData(
      [["map", "list"], { type: "query" }],
      maps.map((m) => ({
        ...m,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
    );

    const trpcClient = trpc.createClient({
      links: [httpBatchLink({ url: "http://localhost:4000/trpc" })],
    });

    return render(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/"]}>
            <LandingPage />
          </MemoryRouter>
        </QueryClientProvider>
      </trpc.Provider>,
    );
  }

  it("shows a delete button on each map card", () => {
    renderWithMaps([
      { id: "map-1", name: "Test Map", thesisStatement: "Thesis 1" },
      { id: "map-2", name: "Another Map", thesisStatement: "Thesis 2" },
    ]);

    expect(screen.getByTestId("delete-map-map-1")).toBeInTheDocument();
    expect(screen.getByTestId("delete-map-map-2")).toBeInTheDocument();
  });

  it("delete button has accessible label with map name", () => {
    renderWithMaps([
      { id: "map-1", name: "Test Map", thesisStatement: "Thesis 1" },
    ]);

    const deleteBtn = screen.getByTestId("delete-map-map-1");
    expect(deleteBtn).toHaveAttribute("aria-label", 'Delete map "Test Map"');
  });

  it("clicking delete button opens a confirmation dialog naming the map", async () => {
    const user = userEvent.setup();
    renderWithMaps([
      { id: "map-1", name: "My Important Map", thesisStatement: "Thesis 1" },
    ]);

    await user.click(screen.getByTestId("delete-map-map-1"));

    expect(screen.getByText("Delete map?")).toBeInTheDocument();
    // The dialog description mentions the map name in a <strong> tag
    const dialogDescription = screen.getByText(/This action cannot be undone/);
    expect(dialogDescription).toBeInTheDocument();
    expect(dialogDescription.textContent).toContain("My Important Map");
  });

  it("clicking delete button does not navigate to the map", async () => {
    const user = userEvent.setup();
    renderWithMaps([
      { id: "map-1", name: "Test Map", thesisStatement: "Thesis 1" },
    ]);

    await user.click(screen.getByTestId("delete-map-map-1"));

    // If navigation happened, the landing page would unmount.
    // The presence of the dialog means we stayed on the landing page.
    expect(screen.getByText("Delete map?")).toBeInTheDocument();
    expect(screen.getByText("Your Maps")).toBeInTheDocument();
  });

  it("cancel button in delete dialog closes it without deleting", async () => {
    const user = userEvent.setup();
    renderWithMaps([
      { id: "map-1", name: "Test Map", thesisStatement: "Thesis 1" },
    ]);

    await user.click(screen.getByTestId("delete-map-map-1"));
    expect(screen.getByText("Delete map?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // Dialog should be closed — map still in list
    expect(screen.queryByText("Delete map?")).not.toBeInTheDocument();
    expect(screen.getByText("Test Map")).toBeInTheDocument();
  });

  it("does not show delete buttons in empty state", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData([["map", "list"], { type: "query" }], []);

    const trpcClient = trpc.createClient({
      links: [httpBatchLink({ url: "http://localhost:4000/trpc" })],
    });

    render(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/"]}>
            <LandingPage />
          </MemoryRouter>
        </QueryClientProvider>
      </trpc.Provider>,
    );

    expect(screen.queryByRole("button", { name: /Delete map/ })).not.toBeInTheDocument();
  });
});
