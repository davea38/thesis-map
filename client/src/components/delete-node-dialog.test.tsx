import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "@/lib/trpc";
import { DeleteNodeDialog } from "./delete-node-dialog";
import { useUIStore } from "@/stores/ui-store";

function renderDialog(options?: {
  nodeId?: string | null;
  onClose?: () => void;
}) {
  const {
    nodeId = "node-1",
    onClose = vi.fn(),
  } = options ?? {};

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const trpcClient = trpc.createClient({
    links: [httpBatchLink({ url: "http://localhost:4000/trpc" })],
  });

  const result = render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <DeleteNodeDialog nodeId={nodeId} onClose={onClose} />
      </QueryClientProvider>
    </trpc.Provider>,
  );

  return { ...result, onClose };
}

beforeEach(() => {
  useUIStore.setState({
    selectedNodeId: null,
    sidePanelOpen: false,
  });
});

describe("DeleteNodeDialog", () => {
  it("renders dialog when nodeId is provided", () => {
    renderDialog({ nodeId: "node-1" });
    expect(screen.getByText("Delete node?")).toBeInTheDocument();
  });

  it("does not render dialog when nodeId is null", () => {
    renderDialog({ nodeId: null });
    expect(screen.queryByText("Delete node?")).not.toBeInTheDocument();
  });

  it("shows cancel and delete buttons", () => {
    renderDialog({ nodeId: "node-1" });
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-delete-node")).toBeInTheDocument();
  });

  it("shows description about permanent deletion", () => {
    renderDialog({ nodeId: "node-1" });
    // Initially shows "Checking..." then updates
    expect(
      screen.getByText(/Checking for descendants|permanently delete/),
    ).toBeInTheDocument();
  });
});
