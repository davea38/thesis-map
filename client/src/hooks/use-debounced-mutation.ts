import { useRef, useCallback, useEffect } from "react";
import type { UseTRPCMutationResult } from "@trpc/react-query/shared";

interface UseDebouncedMutationOptions<TInput, TContext> {
  /** Debounce delay in milliseconds (default: 1500) */
  delay?: number;
  /** Called immediately before the mutation fires. Return a context value for rollback. */
  onOptimisticUpdate?: (input: TInput) => TContext;
  /** Called when the mutation fails. Use the context from onOptimisticUpdate to rollback. */
  onRollback?: (context: TContext) => void;
  /** Called when the mutation succeeds. */
  onSuccess?: () => void;
}

/**
 * Wraps a tRPC mutation with debouncing and optional optimistic updates.
 *
 * The debounced mutate function applies optimistic updates immediately
 * but delays the actual server call by `delay` ms. If called again within
 * the delay window, the previous timer is canceled and a new one starts
 * with the latest input, while preserving the original rollback context.
 */
export function useDebouncedMutation<
  TInput,
  TOutput,
  TContext = undefined,
>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mutation: UseTRPCMutationResult<TOutput, any, TInput, any>,
  options: UseDebouncedMutationOptions<TInput, TContext> = {},
) {
  const { delay = 1500, onOptimisticUpdate, onRollback, onSuccess } = options;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rollbackContextRef = useRef<TContext | null>(null);
  const latestInputRef = useRef<TInput | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const mutate = useCallback(
    (input: TInput) => {
      latestInputRef.current = input;

      // Apply optimistic update on the first call in a debounce window.
      // Subsequent calls in the same window reuse the original context.
      if (onOptimisticUpdate && rollbackContextRef.current === null) {
        rollbackContextRef.current = onOptimisticUpdate(input);
      } else if (onOptimisticUpdate) {
        // Re-apply optimistic update with new input (no new context)
        onOptimisticUpdate(input);
      }

      // Cancel any pending debounce timer
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const savedContext = rollbackContextRef.current;
        rollbackContextRef.current = null;

        mutation.mutate(input, {
          onError: () => {
            if (onRollback && savedContext !== null) {
              onRollback(savedContext);
            }
          },
          onSuccess: () => {
            onSuccess?.();
          },
        });
      }, delay);
    },
    [mutation, delay, onOptimisticUpdate, onRollback, onSuccess],
  );

  /** Immediately flush any pending debounced mutation. */
  const flush = useCallback(() => {
    if (timerRef.current !== null && latestInputRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;

      const input = latestInputRef.current;
      const savedContext = rollbackContextRef.current;
      rollbackContextRef.current = null;
      latestInputRef.current = null;

      mutation.mutate(input, {
        onError: () => {
          if (onRollback && savedContext !== null) {
            onRollback(savedContext);
          }
        },
        onSuccess: () => {
          onSuccess?.();
        },
      });
    }
  }, [mutation, onRollback, onSuccess]);

  /** Cancel any pending debounced mutation without firing it. */
  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;

      // Rollback the optimistic update since we're canceling
      if (onRollback && rollbackContextRef.current !== null) {
        onRollback(rollbackContextRef.current);
      }
      rollbackContextRef.current = null;
      latestInputRef.current = null;
    }
  }, [onRollback]);

  return {
    /** Debounced mutate — applies optimistic update immediately, fires mutation after delay. */
    mutate,
    /** Immediately fire any pending debounced mutation. */
    flush,
    /** Cancel any pending debounced mutation and rollback optimistic update. */
    cancel,
    /** Whether the underlying mutation is currently in-flight. */
    isPending: mutation.isPending,
    /** Whether the underlying mutation has errored. */
    isError: mutation.isError,
    /** The error from the underlying mutation, if any. */
    error: mutation.error,
  };
}
