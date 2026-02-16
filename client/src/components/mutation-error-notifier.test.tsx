import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { MutationErrorNotifier } from "./mutation-error-notifier";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    warning: vi.fn(),
  },
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useMutationState: vi.fn(),
  };
});

import { useMutationState } from "@tanstack/react-query";

const mockUseMutationState = vi.mocked(useMutationState);

describe("MutationErrorNotifier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing (returns null)", () => {
    mockUseMutationState.mockReturnValue([]);
    const { container } = render(<MutationErrorNotifier />);
    expect(container.innerHTML).toBe("");
  });

  it("shows a toast when a mutation fails", () => {
    mockUseMutationState.mockReturnValue([Date.now()]);
    render(<MutationErrorNotifier />);

    expect(toast.warning).toHaveBeenCalledWith(
      "Failed to save changes. Please check your connection.",
      expect.objectContaining({ duration: 8000 }),
    );
  });

  it("does not show a toast when no mutations have failed", () => {
    mockUseMutationState.mockReturnValue([]);
    render(<MutationErrorNotifier />);

    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("does not show duplicate toasts for the same failure", () => {
    const failureTime = Date.now();
    mockUseMutationState.mockReturnValue([failureTime]);

    const { rerender } = render(<MutationErrorNotifier />);
    expect(toast.warning).toHaveBeenCalledTimes(1);

    // Re-render with same failure — should not toast again
    act(() => {
      rerender(<MutationErrorNotifier />);
    });
    expect(toast.warning).toHaveBeenCalledTimes(1);
  });

  it("shows a new toast for a newer failure", () => {
    const firstFailure = Date.now();
    mockUseMutationState.mockReturnValue([firstFailure]);

    const { rerender } = render(<MutationErrorNotifier />);
    expect(toast.warning).toHaveBeenCalledTimes(1);

    // A newer failure arrives
    const secondFailure = firstFailure + 5000;
    mockUseMutationState.mockReturnValue([firstFailure, secondFailure]);

    act(() => {
      rerender(<MutationErrorNotifier />);
    });
    expect(toast.warning).toHaveBeenCalledTimes(2);
  });
});
