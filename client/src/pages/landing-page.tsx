import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatRelativeTime } from "@/lib/format-time";
import { CreateMapDialog } from "@/components/create-map-dialog";
import { DeleteMapDialog } from "@/components/delete-map-dialog";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  const { data: maps, isLoading, error } = trpc.map.list.useQuery();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Maps</h1>
        <CreateMapDialog>
          <Button size="sm">New Map</Button>
        </CreateMapDialog>
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
          <CreateMapDialog>
            <Button>Create your first thesis map</Button>
          </CreateMapDialog>
        </div>
      )}

      {maps && maps.length > 0 && (
        <div className="flex flex-col gap-3">
          {maps.map((map) => (
            <div
              key={map.id}
              className="group relative rounded-lg border bg-card transition-colors hover:bg-accent"
            >
              <Link
                to={`/map/${map.id}`}
                className="block p-4"
                data-testid={`map-link-${map.id}`}
              >
                <div className="flex items-start justify-between gap-4 pr-8">
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
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDeleteTarget({ id: map.id, name: map.name });
                }}
                aria-label={`Delete map "${map.name}"`}
                data-testid={`delete-map-${map.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <DeleteMapDialog
        mapId={deleteTarget?.id ?? null}
        mapName={deleteTarget?.name ?? ""}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => setDeleteTarget(null)}
      />
    </div>
  );
}
