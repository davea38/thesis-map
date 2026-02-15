import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { httpBatchLink } from "@trpc/client";
import { CreateMapDialog } from "./create-map-dialog";
import { Button } from "@/components/ui/button";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderDialog() {
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
        <MemoryRouter initialEntries={["/"]}>
          <CreateMapDialog>
            <Button>Create Map</Button>
          </CreateMapDialog>
        </MemoryRouter>
      </QueryClientProvider>
    </trpc.Provider>,
  );

  return { ...result, user, queryClient };
}

describe("CreateMapDialog", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("renders the trigger button", () => {
    renderDialog();
    expect(screen.getByText("Create Map")).toBeInTheDocument();
  });

  it("opens the dialog when trigger is clicked", async () => {
    const { user } = renderDialog();
    await user.click(screen.getByText("Create Map"));
    expect(screen.getByText("Create a new thesis map")).toBeInTheDocument();
    expect(screen.getByLabelText("Map name")).toBeInTheDocument();
    expect(screen.getByLabelText("Thesis statement")).toBeInTheDocument();
  });

  it("shows validation errors when submitting empty form", async () => {
    const { user } = renderDialog();
    await user.click(screen.getByText("Create Map"));
    await user.click(screen.getByText("Create map"));

    expect(screen.getByText("Map name is required")).toBeInTheDocument();
    expect(
      screen.getByText("Thesis statement is required"),
    ).toBeInTheDocument();
  });

  it("shows validation error only for empty thesis when name is filled", async () => {
    const { user } = renderDialog();
    await user.click(screen.getByText("Create Map"));
    await user.type(screen.getByLabelText("Map name"), "My Map");
    await user.click(screen.getByText("Create map"));

    expect(screen.queryByText("Map name is required")).not.toBeInTheDocument();
    expect(
      screen.getByText("Thesis statement is required"),
    ).toBeInTheDocument();
  });

  it("shows validation error only for empty name when thesis is filled", async () => {
    const { user } = renderDialog();
    await user.click(screen.getByText("Create Map"));
    await user.type(
      screen.getByLabelText("Thesis statement"),
      "Some thesis",
    );
    await user.click(screen.getByText("Create map"));

    expect(screen.getByText("Map name is required")).toBeInTheDocument();
    expect(
      screen.queryByText("Thesis statement is required"),
    ).not.toBeInTheDocument();
  });

  it("clears validation errors when user starts typing", async () => {
    const { user } = renderDialog();
    await user.click(screen.getByText("Create Map"));
    await user.click(screen.getByText("Create map"));

    expect(screen.getByText("Map name is required")).toBeInTheDocument();
    expect(
      screen.getByText("Thesis statement is required"),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Map name"), "a");
    expect(screen.queryByText("Map name is required")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Thesis statement"), "b");
    expect(
      screen.queryByText("Thesis statement is required"),
    ).not.toBeInTheDocument();
  });

  it("resets form when dialog is reopened after cancel", async () => {
    const { user } = renderDialog();

    await user.click(screen.getByText("Create Map"));
    await user.type(screen.getByLabelText("Map name"), "Test");
    await user.type(screen.getByLabelText("Thesis statement"), "Statement");
    await user.click(screen.getByText("Cancel"));

    // Re-open — form resets on open (Radix Dialog may keep stale DOM
    // during exit animation in jsdom, so check the last matching input)
    await user.click(screen.getByText("Create Map"));
    await waitFor(() => {
      const nameInputs = screen.getAllByLabelText("Map name");
      const activeInput = nameInputs[nameInputs.length - 1];
      expect(activeInput).toHaveValue("");
    });
    const thesisInputs = screen.getAllByLabelText("Thesis statement");
    expect(thesisInputs[thesisInputs.length - 1]).toHaveValue("");
  });

  it("has both cancel and submit buttons in the footer", async () => {
    const { user } = renderDialog();
    await user.click(screen.getByText("Create Map"));

    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Create map")).toBeInTheDocument();
  });

  it("does not submit form with whitespace-only values", async () => {
    const { user } = renderDialog();
    await user.click(screen.getByText("Create Map"));
    await user.type(screen.getByLabelText("Map name"), "   ");
    await user.type(screen.getByLabelText("Thesis statement"), "   ");
    await user.click(screen.getByText("Create map"));

    expect(screen.getByText("Map name is required")).toBeInTheDocument();
    expect(
      screen.getByText("Thesis statement is required"),
    ).toBeInTheDocument();
  });
});
