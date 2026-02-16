import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedMutation } from "./use-debounced-mutation";

// Create a mock mutation object that mimics UseTRPCMutationResult
function createMockMutation() {
  const mutateFn = vi.fn();
  return {
    mutate: mutateFn,
    isPending: false,
    isError: false,
    error: null,
    // Minimal fields to satisfy the type — we only use the above in the hook
    data: undefined,
    isIdle: true,
    isSuccess: false,
    status: "idle" as const,
    reset: vi.fn(),
    mutateAsync: vi.fn(),
    variables: undefined,
    failureCount: 0,
    failureReason: null,
    context: undefined,
    submittedAt: 0,
    isPaused: false,
    trpc: { path: "test" },
  };
}

describe("useDebouncedMutation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces mutations — only fires once after delay", () => {
    const mutation = createMockMutation();
     
    const { result } = renderHook(() => useDebouncedMutation(mutation as any, { delay: 500 }));

    act(() => {
      result.current.mutate({ id: "1", statement: "first" });
      result.current.mutate({ id: "1", statement: "second" });
      result.current.mutate({ id: "1", statement: "third" });
    });

    expect(mutation.mutate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mutation.mutate).toHaveBeenCalledTimes(1);
    expect(mutation.mutate).toHaveBeenCalledWith(
      { id: "1", statement: "third" },
      expect.any(Object),
    );
  });

  it("applies optimistic update immediately on first call", () => {
    const mutation = createMockMutation();
    const onOptimisticUpdate = vi.fn().mockReturnValue("rollback-ctx");

     
    const { result } = renderHook(() => useDebouncedMutation(mutation as any, {
      delay: 500,
      onOptimisticUpdate,
    }));

    act(() => {
      result.current.mutate({ id: "1", statement: "hello" });
    });

    expect(onOptimisticUpdate).toHaveBeenCalledWith({ id: "1", statement: "hello" });
    // Mutation should not fire yet (still debouncing)
    expect(mutation.mutate).not.toHaveBeenCalled();
  });

  it("re-applies optimistic update on subsequent calls in same window", () => {
    const mutation = createMockMutation();
    const onOptimisticUpdate = vi.fn().mockReturnValue("rollback-ctx");

     
    const { result } = renderHook(() => useDebouncedMutation(mutation as any, {
      delay: 500,
      onOptimisticUpdate,
    }));

    act(() => {
      result.current.mutate({ id: "1", statement: "first" });
      result.current.mutate({ id: "1", statement: "second" });
    });

    // Optimistic update called twice (once creating context, once updating)
    expect(onOptimisticUpdate).toHaveBeenCalledTimes(2);
    expect(onOptimisticUpdate).toHaveBeenCalledWith({ id: "1", statement: "first" });
    expect(onOptimisticUpdate).toHaveBeenCalledWith({ id: "1", statement: "second" });
  });

  it("calls onRollback with context when mutation fails", () => {
    const mutation = createMockMutation();
    const onOptimisticUpdate = vi.fn().mockReturnValue("saved-state");
    const onRollback = vi.fn();

     
    const { result } = renderHook(() => useDebouncedMutation(mutation as any, {
      delay: 500,
      onOptimisticUpdate,
      onRollback,
    }));

    act(() => {
      result.current.mutate({ id: "1", statement: "test" });
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Simulate the mutation calling its onError callback
    const mutateCallArgs = mutation.mutate.mock.calls[0]!;
    const callbacks = mutateCallArgs[1];
    callbacks.onError();

    expect(onRollback).toHaveBeenCalledWith("saved-state");
  });

  it("calls onSuccess when mutation succeeds", () => {
    const mutation = createMockMutation();
    const onSuccess = vi.fn();

     
    const { result } = renderHook(() => useDebouncedMutation(mutation as any, {
      delay: 500,
      onSuccess,
    }));

    act(() => {
      result.current.mutate({ id: "1" });
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const mutateCallArgs = mutation.mutate.mock.calls[0]!;
    const callbacks = mutateCallArgs[1];
    callbacks.onSuccess();

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("flush fires pending mutation immediately", () => {
    const mutation = createMockMutation();

     
    const { result } = renderHook(() => useDebouncedMutation(mutation as any, { delay: 500 }));

    act(() => {
      result.current.mutate({ id: "1", statement: "flushed" });
    });

    expect(mutation.mutate).not.toHaveBeenCalled();

    act(() => {
      result.current.flush();
    });

    expect(mutation.mutate).toHaveBeenCalledTimes(1);
    expect(mutation.mutate).toHaveBeenCalledWith(
      { id: "1", statement: "flushed" },
      expect.any(Object),
    );
  });

  it("flush does nothing when no mutation is pending", () => {
    const mutation = createMockMutation();

     
    const { result } = renderHook(() => useDebouncedMutation(mutation as any, { delay: 500 }));

    act(() => {
      result.current.flush();
    });

    expect(mutation.mutate).not.toHaveBeenCalled();
  });

  it("cancel stops pending mutation and rolls back", () => {
    const mutation = createMockMutation();
    const onOptimisticUpdate = vi.fn().mockReturnValue("saved-state");
    const onRollback = vi.fn();

     
    const { result } = renderHook(() => useDebouncedMutation(mutation as any, {
      delay: 500,
      onOptimisticUpdate,
      onRollback,
    }));

    act(() => {
      result.current.mutate({ id: "1", statement: "will-cancel" });
    });

    act(() => {
      result.current.cancel();
    });

    // Rollback should have been called
    expect(onRollback).toHaveBeenCalledWith("saved-state");

    // Advancing time should not fire the mutation
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mutation.mutate).not.toHaveBeenCalled();
  });

  it("cancel does nothing when no mutation is pending", () => {
    const mutation = createMockMutation();
    const onRollback = vi.fn();

     
    const { result } = renderHook(() => useDebouncedMutation(mutation as any, {
      delay: 500,
      onRollback,
    }));

    act(() => {
      result.current.cancel();
    });

    expect(onRollback).not.toHaveBeenCalled();
  });

  it("cleans up timer on unmount", () => {
    const mutation = createMockMutation();

     
    const { result, unmount } = renderHook(() => useDebouncedMutation(mutation as any, { delay: 500 }));

    act(() => {
      result.current.mutate({ id: "1" });
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Mutation should not fire after unmount
    expect(mutation.mutate).not.toHaveBeenCalled();
  });

  it("uses default delay of 1500ms", () => {
    const mutation = createMockMutation();

     
    const { result } = renderHook(() => useDebouncedMutation(mutation as any));

    act(() => {
      result.current.mutate({ id: "1" });
    });

    act(() => {
      vi.advanceTimersByTime(1499);
    });

    expect(mutation.mutate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(mutation.mutate).toHaveBeenCalledTimes(1);
  });

  it("exposes mutation state properties", () => {
    const mutation = createMockMutation();
    mutation.isPending = true;
    mutation.isError = true;
    mutation.error = new Error("test error") as never;

     
    const { result } = renderHook(() => useDebouncedMutation(mutation as any));

    expect(result.current.isPending).toBe(true);
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toEqual(new Error("test error"));
  });

  it("resets context between debounce windows", () => {
    const mutation = createMockMutation();
    const onOptimisticUpdate = vi.fn().mockReturnValue("ctx-1");

     
    const { result } = renderHook(() => useDebouncedMutation(mutation as any, {
      delay: 500,
      onOptimisticUpdate,
    }));

    // First debounce window
    act(() => {
      result.current.mutate({ id: "1", statement: "first" });
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mutation.mutate).toHaveBeenCalledTimes(1);

    // Second debounce window — should create new context
    onOptimisticUpdate.mockReturnValue("ctx-2");

    act(() => {
      result.current.mutate({ id: "1", statement: "second" });
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mutation.mutate).toHaveBeenCalledTimes(2);
    expect(onOptimisticUpdate).toHaveBeenCalledTimes(2);
  });
});
