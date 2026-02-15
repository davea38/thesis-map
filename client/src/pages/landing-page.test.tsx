import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
