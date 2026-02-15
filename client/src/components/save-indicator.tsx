import { useIsMutating } from "@tanstack/react-query";

export function SaveIndicator() {
  const mutationCount = useIsMutating();

  if (mutationCount > 0) {
    return (
      <span className="text-xs text-muted-foreground animate-pulse">
        Saving...
      </span>
    );
  }

  return (
    <span className="text-xs text-muted-foreground">Saved</span>
  );
}
