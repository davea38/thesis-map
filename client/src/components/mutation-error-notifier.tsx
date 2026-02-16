import { useEffect, useRef } from "react";
import { useMutationState } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Watches for mutation failures and shows a non-blocking toast warning.
 * This component renders nothing — it only subscribes to mutation state.
 */
export function MutationErrorNotifier() {
  const failedMutations = useMutationState({
    filters: { status: "error" },
    select: (mutation) => mutation.state.submittedAt,
  });

  const lastNotifiedRef = useRef(0);

  useEffect(() => {
    if (failedMutations.length === 0) return;

    // Find the most recent failure timestamp
    const latestFailure = Math.max(...failedMutations);
    if (latestFailure > lastNotifiedRef.current) {
      lastNotifiedRef.current = latestFailure;
      toast.warning("Failed to save changes. Please check your connection.", {
        duration: 8000,
      });
    }
  }, [failedMutations]);

  return null;
}
