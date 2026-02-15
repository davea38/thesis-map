import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { httpBatchLink } from "@trpc/client";

function renderWithProviders(ui: React.ReactElement, { route = "/" } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const trpcClient = trpc.createClient({
    links: [httpBatchLink({ url: "http://localhost:4000/trpc" })],
  });

  return render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </QueryClientProvider>
    </trpc.Provider>,
  );
}

describe("App", () => {
  it("renders the header with app name", () => {
    renderWithProviders(<App />);
    expect(screen.getByText("Thesis Map")).toBeInTheDocument();
  });

  it("renders the landing page at /", () => {
    renderWithProviders(<App />);
    expect(screen.getByText("Your Maps")).toBeInTheDocument();
  });

  it("renders the map view at /map/:id", () => {
    renderWithProviders(<App />, { route: "/map/test-123" });
    expect(screen.getByText("Map: test-123")).toBeInTheDocument();
  });

  it("shows the save indicator", () => {
    renderWithProviders(<App />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });
});
