import { useState, useRef, useEffect, useCallback } from "react";
import { Filter, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useUIStore } from "@/stores/ui-store";
import { getContrastText } from "@/lib/colors";

interface TagFilterPanelProps {
  mapId: string;
}

export function TagFilterPanel({ mapId }: TagFilterPanelProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const activeTagFilters = useUIStore((s) => s.activeTagFilters);
  const toggleTagFilter = useUIStore((s) => s.toggleTagFilter);
  const clearTagFilters = useUIStore((s) => s.clearTagFilters);

  const { data: tags } = trpc.tag.list.useQuery(
    { mapId },
    { enabled: open || activeTagFilters.size > 0 },
  );

  const activeCount = activeTagFilters.size;

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open]);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleClearAll = useCallback(() => {
    clearTagFilters();
  }, [clearTagFilters]);

  const handleTagClick = useCallback(
    (tagId: string) => {
      toggleTagFilter(tagId);
    },
    [toggleTagFilter],
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`flex items-center justify-center h-7 w-7 rounded transition-colors shrink-0 ${
          activeCount > 0
            ? "text-primary bg-primary/10 hover:bg-primary/20"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
        data-testid="tag-filter-button"
        aria-label={
          activeCount > 0
            ? `Tag filters (${activeCount} active)`
            : "Tag filters"
        }
        title="Filter by tag"
        aria-expanded={open}
      >
        <Filter className="h-4 w-4" />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute top-full left-0 mt-1 w-56 rounded-lg border bg-white shadow-lg z-50"
          data-testid="tag-filter-panel"
          role="dialog"
          aria-label="Tag filters"
        >
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-xs font-medium text-foreground">
              Filter by tag
            </span>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                data-testid="clear-tag-filters"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto p-1.5">
            {!tags || tags.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                No tags in this map
              </p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {tags.map((tag) => {
                  const isActive = activeTagFilters.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagClick(tag.id)}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                        isActive
                          ? "bg-accent"
                          : "hover:bg-accent/50"
                      }`}
                      data-testid={`tag-filter-${tag.id}`}
                      aria-pressed={isActive}
                    >
                      <span
                        className="inline-flex items-center rounded-full px-1.5 py-px text-[9px] font-medium leading-tight shrink-0"
                        style={{
                          backgroundColor: tag.color,
                          color: getContrastText(tag.color),
                        }}
                      >
                        {tag.name}
                      </span>
                      <span className="text-muted-foreground ml-auto text-[10px]">
                        {tag.nodeCount} node{tag.nodeCount === 1 ? "" : "s"}
                      </span>
                      {isActive && (
                        <X className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
