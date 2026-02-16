import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useDebouncedMutation } from "@/hooks/use-debounced-mutation";
import { SaveIndicator } from "@/components/save-indicator";
import { TagFilterPanel } from "@/components/tag-filter-panel";

interface MapToolbarProps {
  mapId: string;
  mapName: string;
  onDeleteRequest?: () => void;
}

export function MapToolbar({ mapId, mapName, onDeleteRequest }: MapToolbarProps) {
  const [nameValue, setNameValue] = useState(mapName);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  // Sync local state with server data when props change
  useEffect(() => {
    setNameValue(mapName);
  }, [mapName]);

  const updateMapMutation = trpc.map.update.useMutation();

  const debouncedNameUpdate = useDebouncedMutation(updateMapMutation, {
    delay: 1500,
    onSuccess: () => {
      utils.map.getById.invalidate();
      utils.map.list.invalidate();
    },
  });

  const handleNameChange = useCallback(
    (value: string) => {
      setNameValue(value);
      // Only send non-empty names to the server
      if (value.trim()) {
        debouncedNameUpdate.mutate({ id: mapId, name: value.trim() });
      }
    },
    [mapId, debouncedNameUpdate],
  );

  const handleStartEditing = useCallback(() => {
    setIsEditing(true);
    // Focus the input after render
    requestAnimationFrame(() => {
      inputRef.current?.select();
    });
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    // If the name is empty, revert to the server value
    if (!nameValue.trim()) {
      setNameValue(mapName);
    } else {
      // Flush any pending debounced mutation
      debouncedNameUpdate.flush();
    }
  }, [nameValue, mapName, debouncedNameUpdate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        inputRef.current?.blur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        // Cancel editing and revert
        setNameValue(mapName);
        debouncedNameUpdate.cancel();
        setIsEditing(false);
      }
    },
    [mapName, debouncedNameUpdate],
  );

  return (
    <div
      className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-lg border bg-white/95 backdrop-blur-sm px-2 py-1.5 shadow-sm"
      data-testid="map-toolbar"
    >
      <Link
        to="/"
        className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        data-testid="back-link"
        aria-label="Back to maps"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Maps</span>
      </Link>

      <div className="h-4 w-px bg-border shrink-0" />

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={nameValue}
          onChange={(e) => handleNameChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="text-sm font-medium bg-transparent outline-none border-b border-primary px-0.5 min-w-[120px] max-w-[300px]"
          data-testid="map-name-input"
          aria-label="Map name"
          autoFocus
        />
      ) : (
        <button
          type="button"
          onClick={handleStartEditing}
          className="text-sm font-medium truncate max-w-[300px] hover:text-primary transition-colors cursor-text"
          data-testid="map-name-display"
          title="Click to edit map name"
        >
          {nameValue || "(untitled)"}
        </button>
      )}

      <div className="h-4 w-px bg-border shrink-0" />

      <SaveIndicator />

      <div className="h-4 w-px bg-border shrink-0" />

      <TagFilterPanel mapId={mapId} />

      {onDeleteRequest && (
        <>
          <div className="h-4 w-px bg-border shrink-0" />
          <button
            type="button"
            onClick={onDeleteRequest}
            className="flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            data-testid="delete-map-button"
            aria-label="Delete map"
            title="Delete map"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
