import { Link } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { formatRelativeTime } from "@/lib/format-time";

export function LandingPage() {
  const { data: maps, isLoading, error } = trpc.map.list.useQuery();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Maps</h1>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border bg-card p-4"
            >
              <div className="mb-2 h-5 w-1/3 rounded bg-muted" />
              <div className="mb-3 h-4 w-2/3 rounded bg-muted" />
              <div className="h-3 w-1/4 rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load maps. Please try again later.
        </div>
      )}

      {maps && maps.length === 0 && (
        <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center gap-4 text-center">
          <p className="text-lg text-muted-foreground">
            No thesis maps yet. Create one to start structuring your arguments.
          </p>
          <Link
            to="/map/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create your first thesis map
          </Link>
        </div>
      )}

      {maps && maps.length > 0 && (
        <div className="flex flex-col gap-3">
          {maps.map((map) => (
            <Link
              key={map.id}
              to={`/map/${map.id}`}
              className="group rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-semibold group-hover:text-accent-foreground">
                    {map.name}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {map.thesisStatement}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelativeTime(map.updatedAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
