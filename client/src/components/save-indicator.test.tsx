import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SaveIndicator } from "./save-indicator";

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useIsMutating: vi.fn(),
    useMutationState: vi.fn(),
  };
});

import { useIsMutating, useMutationState } from "@tanstack/react-query";

const mockUseIsMutating = vi.mocked(useIsMutating);
const mockUseMutationState = vi.mocked(useMutationState);

describe("SaveIndicator", () => {
  it("shows 'Saved' when no mutations are in-flight and no errors", () => {
    mockUseIsMutating.mockReturnValue(0);
    mockUseMutationState.mockReturnValue([]);

    render(<SaveIndicator />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("shows 'Saving...' when mutations are in-flight", () => {
    mockUseIsMutating.mockReturnValue(2);
    mockUseMutationState.mockReturnValue([]);

    render(<SaveIndicator />);
    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });

  it("shows 'Saving...' with animate-pulse class", () => {
    mockUseIsMutating.mockReturnValue(1);
    mockUseMutationState.mockReturnValue([]);

    render(<SaveIndicator />);
    const el = screen.getByText("Saving...");
    expect(el.className).toContain("animate-pulse");
  });

  it("shows 'Save error' when mutations have failed and none in-flight", () => {
    mockUseIsMutating.mockReturnValue(0);
    mockUseMutationState.mockReturnValue(["error"]);

    render(<SaveIndicator />);
    expect(screen.getByText("Save error")).toBeInTheDocument();
  });

  it("shows error with amber color", () => {
    mockUseIsMutating.mockReturnValue(0);
    mockUseMutationState.mockReturnValue(["error"]);

    render(<SaveIndicator />);
    const el = screen.getByText("Save error");
    expect(el.className).toContain("text-amber-600");
  });

  it("shows error with helpful title attribute", () => {
    mockUseIsMutating.mockReturnValue(0);
    mockUseMutationState.mockReturnValue(["error"]);

    render(<SaveIndicator />);
    const el = screen.getByText("Save error");
    expect(el).toHaveAttribute("title", expect.stringContaining("failed to save"));
  });

  it("prioritizes 'Saving...' over error state when mutations are in-flight", () => {
    mockUseIsMutating.mockReturnValue(1);
    mockUseMutationState.mockReturnValue(["error"]);

    render(<SaveIndicator />);
    expect(screen.getByText("Saving...")).toBeInTheDocument();
    expect(screen.queryByText("Save error")).not.toBeInTheDocument();
  });
});
