import { useState, useCallback, useRef, useEffect } from "react";
import {
  Globe,
  ExternalLink,
  RefreshCw,
  Trash2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useDebouncedMutation } from "@/hooks/use-debounced-mutation";

interface SourceAttachment {
  id: string;
  url: string | null;
  noteText: string | null;
  previewTitle: string | null;
  previewDescription: string | null;
  previewImageUrl: string | null;
  previewFaviconUrl: string | null;
  previewSiteName: string | null;
  previewFetchStatus: string | null;
  previewFetchError: string | null;
}

interface SourceCardProps {
  attachment: SourceAttachment;
  onRemove: (id: string) => void;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function SourceCard({ attachment, onRemove }: SourceCardProps) {
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState(attachment.url ?? "");
  const [noteValue, setNoteValue] = useState(attachment.noteText ?? "");
  const urlInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const updateMutation = trpc.attachment.update.useMutation({
    onSuccess: () => {
      utils.node.getById.invalidate();
      utils.map.getById.invalidate();
    },
  });

  const refreshMutation = trpc.attachment.refreshPreview.useMutation({
    onSuccess: () => {
      utils.node.getById.invalidate();
      utils.map.getById.invalidate();
    },
  });

  const debouncedNoteUpdate = useDebouncedMutation(updateMutation, {
    delay: 1500,
    onSuccess: () => {
      utils.node.getById.invalidate();
      utils.map.getById.invalidate();
    },
  });

  // Sync note value with server data
  useEffect(() => {
    setNoteValue(attachment.noteText ?? "");
  }, [attachment.noteText]);

  // Sync URL draft when not editing
  useEffect(() => {
    if (!isEditingUrl) {
      setUrlDraft(attachment.url ?? "");
    }
  }, [attachment.url, isEditingUrl]);

  const handleStartEditUrl = useCallback(() => {
    setUrlDraft(attachment.url ?? "");
    setIsEditingUrl(true);
    setTimeout(() => urlInputRef.current?.focus(), 0);
  }, [attachment.url]);

  const handleConfirmUrl = useCallback(() => {
    const trimmed = urlDraft.trim();
    if (trimmed && trimmed !== attachment.url) {
      updateMutation.mutate({ id: attachment.id, url: trimmed });
    }
    setIsEditingUrl(false);
  }, [urlDraft, attachment.url, attachment.id, updateMutation]);

  const handleCancelEditUrl = useCallback(() => {
    setUrlDraft(attachment.url ?? "");
    setIsEditingUrl(false);
  }, [attachment.url]);

  const handleUrlKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleConfirmUrl();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancelEditUrl();
      }
    },
    [handleConfirmUrl, handleCancelEditUrl],
  );

  const handleNoteChange = useCallback(
    (value: string) => {
      setNoteValue(value);
      debouncedNoteUpdate.mutate({ id: attachment.id, noteText: value });
    },
    [attachment.id, debouncedNoteUpdate],
  );

  const handleRefreshPreview = useCallback(() => {
    refreshMutation.mutate({ id: attachment.id });
  }, [attachment.id, refreshMutation]);

  const handleOpenUrl = useCallback(() => {
    if (attachment.url) {
      window.open(attachment.url, "_blank", "noopener,noreferrer");
    }
  }, [attachment.url]);

  const status = attachment.previewFetchStatus;
  const domain = attachment.url ? extractDomain(attachment.url) : "";

  return (
    <div
      className="rounded-md border bg-card text-card-foreground"
      data-testid={`source-card-${attachment.id}`}
    >
      {/* Card content based on status */}
      {status === "pending" ? (
        <SourceCardLoading url={attachment.url} domain={domain} />
      ) : status === "failed" ? (
        <SourceCardFailed
          url={attachment.url}
          domain={domain}
          error={attachment.previewFetchError}
          onRetry={handleRefreshPreview}
          isRetrying={refreshMutation.isPending}
        />
      ) : (
        <SourceCardSuccess
          attachment={attachment}
          domain={domain}
        />
      )}

      {/* URL edit row */}
      <div className="border-t px-3 py-2">
        {isEditingUrl ? (
          <div className="flex items-center gap-1">
            <input
              ref={urlInputRef}
              type="text"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={handleUrlKeyDown}
              onBlur={handleConfirmUrl}
              className="flex-1 rounded border border-border bg-transparent px-2 py-1 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              data-testid={`source-url-input-${attachment.id}`}
              placeholder="Enter URL..."
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleConfirmUrl}
              className="rounded p-1 text-green-600 hover:bg-green-50 transition-colors"
              aria-label="Confirm URL"
              data-testid={`source-url-confirm-${attachment.id}`}
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCancelEditUrl}
              className="rounded p-1 text-muted-foreground hover:bg-accent transition-colors"
              aria-label="Cancel URL edit"
              data-testid={`source-url-cancel-${attachment.id}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-1">
            <a
              href={attachment.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary truncate flex-1"
              title={attachment.url ?? ""}
              data-testid={`source-url-link-${attachment.id}`}
            >
              {attachment.url ?? "No URL"}
            </a>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={handleStartEditUrl}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                aria-label="Edit URL"
                title="Edit URL"
                data-testid={`source-edit-url-${attachment.id}`}
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={handleRefreshPreview}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                aria-label="Refresh preview"
                title="Refresh preview"
                disabled={refreshMutation.isPending}
                data-testid={`source-refresh-${attachment.id}`}
              >
                <RefreshCw
                  className={
                    "h-3 w-3" +
                    (refreshMutation.isPending ? " animate-spin" : "")
                  }
                />
              </button>
              <button
                type="button"
                onClick={handleOpenUrl}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                aria-label="Open URL in new tab"
                title="Open in new tab"
                data-testid={`source-open-url-${attachment.id}`}
              >
                <ExternalLink className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(attachment.id)}
                className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                aria-label="Remove source"
                title="Remove"
                data-testid={`source-remove-${attachment.id}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User note (inline editable) */}
      <div className="border-t px-3 py-2">
        <textarea
          value={noteValue}
          onChange={(e) => handleNoteChange(e.target.value)}
          placeholder="Add a note about this source..."
          rows={1}
          className="w-full rounded border-0 bg-transparent px-0 py-0 text-xs text-muted-foreground outline-none resize-y placeholder:text-muted-foreground/50 focus:ring-0"
          data-testid={`source-note-input-${attachment.id}`}
        />
      </div>
    </div>
  );
}

function SourceCardLoading({
  url,
  domain,
}: {
  url: string | null;
  domain: string;
}) {
  return (
    <div className="p-3 space-y-2" data-testid="source-card-loading">
      {/* Shimmer skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded bg-muted animate-pulse" />
        <div className="h-3 w-24 rounded bg-muted animate-pulse" />
      </div>
      <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
      <div className="space-y-1">
        <div className="h-3 w-full rounded bg-muted animate-pulse" />
        <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
      </div>
      {url && (
        <p className="text-xs text-muted-foreground truncate">{domain}</p>
      )}
    </div>
  );
}

function SourceCardFailed({
  url,
  domain,
  error,
  onRetry,
  isRetrying,
}: {
  url: string | null;
  domain: string;
  error: string | null;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <div className="p-3" data-testid="source-card-failed">
      <div className="flex items-start gap-2">
        <Globe className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{domain || "Unknown"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Preview unavailable
          </p>
          {error && (
            <p className="text-xs text-red-500 mt-0.5 truncate" title={error}>
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="mt-1.5 inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
            data-testid="source-retry-button"
          >
            <RefreshCw
              className={
                "h-3 w-3" + (isRetrying ? " animate-spin" : "")
              }
            />
            {isRetrying ? "Retrying..." : "Retry"}
          </button>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-1 text-xs text-primary hover:underline truncate"
            >
              {url}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function SourceCardSuccess({
  attachment,
  domain,
}: {
  attachment: SourceAttachment;
  domain: string;
}) {
  const hasFavicon = !!attachment.previewFaviconUrl;
  const hasImage = !!attachment.previewImageUrl;
  const hasTitle = !!attachment.previewTitle;
  const hasDescription = !!attachment.previewDescription;

  return (
    <div className="p-3" data-testid="source-card-success">
      {/* Header: favicon + site name */}
      <div className="flex items-center gap-1.5 mb-1.5">
        {hasFavicon ? (
          <img
            src={attachment.previewFaviconUrl!}
            alt=""
            className="h-4 w-4 rounded-sm shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
            data-testid="source-favicon"
          />
        ) : (
          <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="text-xs text-muted-foreground truncate">
          {attachment.previewSiteName || domain}
        </span>
      </div>

      {/* Title */}
      {hasTitle && (
        <p
          className="text-sm font-medium leading-snug mb-1"
          data-testid="source-preview-title"
        >
          {attachment.previewTitle}
        </p>
      )}

      {/* Description (2-3 lines truncated) */}
      {hasDescription && (
        <p
          className="text-xs text-muted-foreground leading-relaxed mb-1.5 line-clamp-3"
          data-testid="source-preview-description"
        >
          {attachment.previewDescription}
        </p>
      )}

      {/* Preview image (lazy-loaded) */}
      {hasImage && (
        <img
          src={attachment.previewImageUrl!}
          alt={attachment.previewTitle ?? "Preview"}
          loading="lazy"
          className="w-full h-32 object-cover rounded-sm mt-1"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
          data-testid="source-preview-image"
        />
      )}
    </div>
  );
}
