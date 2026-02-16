import { useIsMutating, useMutationState } from "@tanstack/react-query";

export function SaveIndicator() {
  const mutationCount = useIsMutating();
  const failedMutations = useMutationState({
    filters: { status: "error" },
    select: (mutation) => mutation.state.status,
  });

  const hasErrors = failedMutations.length > 0;

  if (mutationCount > 0) {
    return (
      <span className="text-xs text-muted-foreground animate-pulse">
        Saving...
      </span>
    );
  }

  if (hasErrors) {
    return (
      <span className="text-xs text-amber-600" title="Some changes failed to save. They will be retried automatically.">
        Save error
      </span>
    );
  }

  return (
    <span className="text-xs text-muted-foreground">Saved</span>
  );
}
