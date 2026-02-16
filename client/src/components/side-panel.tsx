import { useEffect, useRef, useCallback, useState } from "react";
import { X, Plus, Settings } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { trpc } from "@/lib/trpc";
import {
  getPolarityColors,
  POLARITY_COLORS,
  TAG_COLOR_PALETTE,
  getContrastText,
  type Polarity,
} from "@/lib/colors";
import { useDebouncedMutation } from "@/hooks/use-debounced-mutation";
import { SourceCard } from "./source-card";
import { NoteCard } from "./note-card";
import { ManageTagsDialog } from "./manage-tags-dialog";

export function SidePanel() {
  const selectedNodeId = useUIStore((s) => s.selectedNodeId);
  const sidePanelOpen = useUIStore((s) => s.sidePanelOpen);
  const sidePanelScrollTarget = useUIStore((s) => s.sidePanelScrollTarget);
  const closeSidePanel = useUIStore((s) => s.closeSidePanel);

  const panelRef = useRef<HTMLDivElement>(null);
  const attachmentsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to target section when sidePanelScrollTarget is set
  useEffect(() => {
    if (!sidePanelScrollTarget || !sidePanelOpen) return;

    // Small delay to ensure the panel has rendered and transitioned
    const timer = setTimeout(() => {
      if (sidePanelScrollTarget === "attachments" && attachmentsRef.current) {
        attachmentsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      // Clear the scroll target after scrolling
      useUIStore.getState().openSidePanel();
    }, 150);

    return () => clearTimeout(timer);
  }, [sidePanelScrollTarget, sidePanelOpen]);

  const handleClose = useCallback(() => {
    closeSidePanel();
  }, [closeSidePanel]);

  // Fetch node data when a node is selected
  const { data: nodeData, isLoading } = trpc.node.getById.useQuery(
    { id: selectedNodeId! },
    { enabled: !!selectedNodeId && sidePanelOpen },
  );

  const utils = trpc.useUtils();

  // Statement editing state
  const [statementValue, setStatementValue] = useState("");
  // Body editing state
  const [bodyValue, setBodyValue] = useState("");
  // Strength editing state
  const [strengthValue, setStrengthValue] = useState(0);
  // Polarity editing state
  const [polarityValue, setPolarityValue] = useState<Polarity>("neutral");

  // Tag management state
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [showNewTagForm, setShowNewTagForm] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState<string>(TAG_COLOR_PALETTE[0]);
  const [newTagError, setNewTagError] = useState("");
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // Sync local state with server data when node changes
  useEffect(() => {
    if (nodeData) {
      setStatementValue(nodeData.statement);
      setBodyValue(nodeData.body);
      setStrengthValue(nodeData.strength ?? 0);
      setPolarityValue((nodeData.polarity as Polarity) ?? "neutral");
    }
  }, [nodeData]);

  const updateNodeMutation = trpc.node.update.useMutation();

  const debouncedStatementUpdate = useDebouncedMutation(updateNodeMutation, {
    delay: 1500,
    onSuccess: () => {
      utils.node.getById.invalidate();
      utils.map.getById.invalidate();
    },
  });

  const debouncedBodyUpdate = useDebouncedMutation(updateNodeMutation, {
    delay: 1500,
    onSuccess: () => {
      utils.node.getById.invalidate();
      utils.map.getById.invalidate();
    },
  });

  const debouncedStrengthUpdate = useDebouncedMutation(updateNodeMutation, {
    delay: 500,
    onSuccess: () => {
      utils.node.getById.invalidate();
      utils.map.getById.invalidate();
    },
  });

  const debouncedPolarityUpdate = useDebouncedMutation(updateNodeMutation, {
    delay: 500,
    onSuccess: () => {
      utils.node.getById.invalidate();
      utils.map.getById.invalidate();
    },
  });

  // Tag queries and mutations
  const { data: mapTags } = trpc.tag.list.useQuery(
    { mapId: nodeData?.mapId ?? "" },
    { enabled: !!nodeData?.mapId && sidePanelOpen },
  );

  const addTagMutation = trpc.tag.addToNode.useMutation({
    onSuccess: () => {
      utils.node.getById.invalidate();
      utils.map.getById.invalidate();
      utils.tag.list.invalidate();
    },
  });

  const removeTagMutation = trpc.tag.removeFromNode.useMutation({
    onSuccess: () => {
      utils.node.getById.invalidate();
      utils.map.getById.invalidate();
      utils.tag.list.invalidate();
    },
  });

  const createTagMutation = trpc.tag.create.useMutation({
    onSuccess: (tag) => {
      if (selectedNodeId) {
        addTagMutation.mutate({ tagId: tag.id, nodeId: selectedNodeId });
      }
      utils.tag.list.invalidate();
      setNewTagName("");
      setNewTagColor(TAG_COLOR_PALETTE[0]);
      setNewTagError("");
      setShowNewTagForm(false);
    },
    onError: (err) => {
      setNewTagError(err.message);
    },
  });

  const handleStatementChange = useCallback(
    (value: string) => {
      setStatementValue(value);
      if (selectedNodeId) {
        debouncedStatementUpdate.mutate({ id: selectedNodeId, statement: value });
      }
    },
    [selectedNodeId, debouncedStatementUpdate],
  );

  const handleBodyChange = useCallback(
    (value: string) => {
      setBodyValue(value);
      if (selectedNodeId) {
        debouncedBodyUpdate.mutate({ id: selectedNodeId, body: value });
      }
    },
    [selectedNodeId, debouncedBodyUpdate],
  );

  const handleStrengthChange = useCallback(
    (value: number) => {
      const clamped = Math.max(0, Math.min(100, Math.round(value)));
      setStrengthValue(clamped);
      if (selectedNodeId) {
        debouncedStrengthUpdate.mutate({ id: selectedNodeId, strength: clamped });
      }
    },
    [selectedNodeId, debouncedStrengthUpdate],
  );

  const handlePolarityChange = useCallback(
    (value: Polarity) => {
      setPolarityValue(value);
      if (selectedNodeId) {
        debouncedPolarityUpdate.mutate({ id: selectedNodeId, polarity: value });
      }
    },
    [selectedNodeId, debouncedPolarityUpdate],
  );

  const handleAddTag = useCallback(
    (tagId: string) => {
      if (selectedNodeId) {
        addTagMutation.mutate({ tagId, nodeId: selectedNodeId });
      }
      setTagDropdownOpen(false);
    },
    [selectedNodeId, addTagMutation],
  );

  const handleRemoveTag = useCallback(
    (tagId: string) => {
      if (selectedNodeId) {
        removeTagMutation.mutate({ tagId, nodeId: selectedNodeId });
      }
    },
    [selectedNodeId, removeTagMutation],
  );

  const handleCreateTag = useCallback(() => {
    const trimmed = newTagName.trim();
    if (!trimmed) {
      setNewTagError("Tag name is required");
      return;
    }
    if (!nodeData?.mapId) return;
    createTagMutation.mutate({
      mapId: nodeData.mapId,
      name: trimmed,
      color: newTagColor as typeof TAG_COLOR_PALETTE[number],
    });
  }, [newTagName, newTagColor, nodeData?.mapId, createTagMutation]);

  // Close tag dropdown on click outside
  useEffect(() => {
    if (!tagDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false);
        setShowNewTagForm(false);
        setNewTagName("");
        setNewTagError("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [tagDropdownOpen]);

  // Reset tag form state when selected node changes
  useEffect(() => {
    setTagDropdownOpen(false);
    setShowNewTagForm(false);
    setNewTagName("");
    setNewTagError("");
    setNewTagColor(TAG_COLOR_PALETTE[0]);
  }, [selectedNodeId]);

  if (!sidePanelOpen || !selectedNodeId) {
    return null;
  }

  const node = nodeData;
  const isRoot = node?.parentId === null;
  const colors = node ? getPolarityColors(node.polarity) : null;

  return (
    <>
      {/* Desktop/tablet: right-side overlay panel */}
      <div
        ref={panelRef}
        data-testid="side-panel"
        className={
          // Desktop: fixed right panel overlay
          // Mobile (<768px): fixed bottom sheet
          "fixed z-50 bg-white shadow-xl border-l border-border flex flex-col " +
          // Desktop (md+): right panel
          "md:top-12 md:right-0 md:bottom-0 md:w-96 md:border-l md:border-t-0 " +
          // Mobile: bottom sheet
          "max-md:left-0 max-md:right-0 max-md:bottom-0 max-md:max-h-[70vh] max-md:rounded-t-2xl max-md:border-t max-md:border-l-0 " +
          // Transition
          "transition-transform duration-300 ease-in-out " +
          (sidePanelOpen
            ? "translate-x-0 max-md:translate-y-0"
            : "translate-x-full max-md:translate-x-0 max-md:translate-y-full")
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {colors && (
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: colors.border }}
              />
            )}
            <h2 className="text-sm font-semibold truncate">
              {isLoading
                ? "Loading..."
                : isRoot
                  ? "Root Node"
                  : node?.statement || "(untitled)"}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label="Close side panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {/* Skeleton placeholders */}
              <div className="space-y-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-10 w-full bg-muted animate-pulse rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-20 w-full bg-muted animate-pulse rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                <div className="h-6 w-full bg-muted animate-pulse rounded" />
              </div>
            </div>
          ) : node ? (
            <div className="p-4 space-y-6">
              {/* Statement section */}
              <section data-testid="section-statement">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Statement
                  {isRoot && (
                    <span className="ml-1 text-[10px] normal-case tracking-normal text-muted-foreground/70">
                      (map thesis — edits update the map title)
                    </span>
                  )}
                </h3>
                <input
                  type="text"
                  value={statementValue}
                  onChange={(e) => handleStatementChange(e.target.value)}
                  placeholder="Enter statement..."
                  className="w-full rounded-md border border-border bg-transparent px-3 py-1.5 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  data-testid="statement-input"
                />
              </section>

              {/* Body section */}
              <section data-testid="section-body">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Primary Reasoning
                </h3>
                <textarea
                  value={bodyValue}
                  onChange={(e) => handleBodyChange(e.target.value)}
                  placeholder="Enter your reasoning..."
                  rows={4}
                  className="w-full rounded-md border border-border bg-transparent px-3 py-1.5 text-sm outline-none resize-y focus:border-ring focus:ring-1 focus:ring-ring"
                  data-testid="body-input"
                />
              </section>

              {/* Strength & Polarity (hidden for root) */}
              {!isRoot && (
                <section data-testid="section-properties">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Properties
                  </h3>
                  <div className="space-y-4 text-sm">
                    {/* Strength slider + numeric input */}
                    <div data-testid="strength-editor">
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="strength-slider"
                          className="text-muted-foreground"
                        >
                          Strength
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={strengthValue}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === "") {
                                setStrengthValue(0);
                                return;
                              }
                              handleStrengthChange(parseInt(raw, 10));
                            }}
                            className="w-14 rounded border border-border bg-transparent px-1.5 py-0.5 text-sm text-right outline-none focus:border-ring focus:ring-1 focus:ring-ring [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            data-testid="strength-number-input"
                            aria-label="Strength percentage"
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </div>
                      <input
                        id="strength-slider"
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={strengthValue}
                        onChange={(e) => handleStrengthChange(parseInt(e.target.value, 10))}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-muted"
                        data-testid="strength-slider"
                        aria-label="Strength slider"
                      />
                    </div>
                    {/* Polarity selector */}
                    <div data-testid="polarity-selector">
                      <label className="text-muted-foreground block mb-1.5">
                        Polarity
                      </label>
                      <div className="flex gap-1.5">
                        {(["tailwind", "headwind", "neutral"] as const).map(
                          (p) => {
                            const pc = POLARITY_COLORS[p];
                            const isSelected = polarityValue === p;
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => handlePolarityChange(p)}
                                className={
                                  "flex-1 rounded-md border-2 px-2 py-1 text-xs font-medium capitalize transition-colors " +
                                  (isSelected
                                    ? "ring-1 ring-offset-1"
                                    : "opacity-60 hover:opacity-100")
                                }
                                style={{
                                  borderColor: pc.border,
                                  backgroundColor: isSelected ? pc.bg : "transparent",
                                  color: pc.text,
                                  ...(isSelected ? { ringColor: pc.border } : {}),
                                }}
                                aria-pressed={isSelected}
                                data-testid={`polarity-${p}`}
                              >
                                {p}
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Tags section */}
              <section data-testid="section-tags">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Tags
                  </h3>
                  <ManageTagsDialog mapId={node.mapId}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      data-testid="manage-tags-button"
                    >
                      <Settings className="h-3 w-3" />
                      Manage
                    </button>
                  </ManageTagsDialog>
                </div>

                {/* Applied tags as removable chips */}
                {node.tags && node.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mb-2" data-testid="applied-tags">
                    {node.tags.map((tag: { id: string; name: string; color: string }) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: tag.color,
                          color: getContrastText(tag.color),
                        }}
                        data-testid={`tag-chip-${tag.id}`}
                      >
                        {tag.name}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag.id)}
                          className="ml-0.5 rounded-full hover:bg-black/20 transition-colors"
                          aria-label={`Remove tag ${tag.name}`}
                          data-testid={`tag-remove-${tag.id}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-2">No tags.</p>
                )}

                {/* Add tag dropdown */}
                <div className="relative" ref={tagDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
                    className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                    data-testid="add-tag-button"
                  >
                    + Add tag
                  </button>

                  {tagDropdownOpen && (() => {
                    const nodeTags = node.tags ?? [];
                    const nodeTagIds = new Set(nodeTags.map((t: { id: string }) => t.id));
                    const availableTags = (mapTags ?? []).filter(
                      (t: { id: string }) => !nodeTagIds.has(t.id),
                    );

                    return (
                      <div
                        className="absolute left-0 top-full mt-1 z-10 w-64 rounded-md border bg-white shadow-lg"
                        data-testid="tag-dropdown"
                      >
                        {/* Available tags to add */}
                        {availableTags.length > 0 && (
                          <div className="max-h-32 overflow-y-auto p-1">
                            {availableTags.map((tag: { id: string; name: string; color: string }) => (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => handleAddTag(tag.id)}
                                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent transition-colors"
                                data-testid={`tag-option-${tag.id}`}
                              >
                                <span
                                  className="h-3 w-3 rounded-full shrink-0"
                                  style={{ backgroundColor: tag.color }}
                                />
                                {tag.name}
                              </button>
                            ))}
                          </div>
                        )}

                        {availableTags.length === 0 && !showNewTagForm && (
                          <div className="px-3 py-2 text-xs text-muted-foreground">
                            No more tags available
                          </div>
                        )}

                        {/* Separator */}
                        <div className="border-t" />

                        {/* Create new tag */}
                        {!showNewTagForm ? (
                          <button
                            type="button"
                            onClick={() => setShowNewTagForm(true)}
                            className="w-full px-3 py-2 text-left text-xs text-primary hover:bg-accent transition-colors"
                            data-testid="create-new-tag-button"
                          >
                            + Create new tag
                          </button>
                        ) : (
                          <div className="p-2 space-y-2" data-testid="new-tag-form">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={newTagName}
                                onChange={(e) => {
                                  setNewTagName(e.target.value);
                                  setNewTagError("");
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleCreateTag();
                                  }
                                }}
                                placeholder="Tag name..."
                                className="flex-1 rounded border border-border px-2 py-1 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                                data-testid="new-tag-name-input"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={handleCreateTag}
                                className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90 transition-colors"
                                data-testid="new-tag-submit"
                              >
                                Add
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {TAG_COLOR_PALETTE.map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => setNewTagColor(color)}
                                  className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110"
                                  style={{
                                    backgroundColor: color,
                                    borderColor:
                                      newTagColor === color ? "#1e293b" : "transparent",
                                  }}
                                  title={color}
                                  data-testid={`new-tag-color-${color}`}
                                />
                              ))}
                            </div>
                            {newTagError && (
                              <p className="text-xs text-red-500" data-testid="new-tag-error">
                                {newTagError}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </section>

              {/* Attachments section */}
              <AttachmentsSection
                attachmentsRef={attachmentsRef}
                nodeId={selectedNodeId}
                attachments={node.attachments ?? []}
              />

              {/* Aggregation section */}
              {node.aggregation && (
                <section data-testid="section-aggregation">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Aggregation
                  </h3>
                  <div className="space-y-2">
                    <div className="flex h-2 w-full overflow-hidden rounded-full">
                      <div
                        className="transition-all duration-300"
                        style={{
                          width: `${Math.round(node.aggregation.balanceRatio * 100)}%`,
                          backgroundColor: "#22c55e",
                        }}
                      />
                      <div
                        className="transition-all duration-300"
                        style={{
                          width: `${100 - Math.round(node.aggregation.balanceRatio * 100)}%`,
                          backgroundColor: "#ef4444",
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Tailwind: {node.aggregation.tailwindTotal}</span>
                      <span>{Math.round(node.aggregation.balanceRatio * 100)}%</span>
                      <span>Headwind: {node.aggregation.headwindTotal}</span>
                    </div>
                  </div>
                </section>
              )}
            </div>
          ) : null}
        </div>

        {/* Mobile drag handle indicator */}
        <div className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-muted-foreground/30" />
      </div>
    </>
  );
}

interface AttachmentData {
  id: string;
  type: string;
  url?: string | null;
  noteText?: string | null;
  previewTitle?: string | null;
  previewDescription?: string | null;
  previewImageUrl?: string | null;
  previewFaviconUrl?: string | null;
  previewSiteName?: string | null;
  previewFetchStatus?: string | null;
  previewFetchError?: string | null;
}

function AttachmentsSection({
  attachmentsRef,
  nodeId,
  attachments,
}: {
  attachmentsRef: React.RefObject<HTMLDivElement | null>;
  nodeId: string;
  attachments: AttachmentData[];
}) {
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceError, setNewSourceError] = useState("");
  const sourceUrlInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const createMutation = trpc.attachment.create.useMutation({
    onSuccess: () => {
      utils.node.getById.invalidate();
      utils.map.getById.invalidate();
      setNewSourceUrl("");
      setNewSourceError("");
      setIsAddingSource(false);
    },
    onError: (err) => {
      setNewSourceError(err.message);
    },
  });

  const createNoteMutation = trpc.attachment.create.useMutation({
    onSuccess: () => {
      utils.node.getById.invalidate();
      utils.map.getById.invalidate();
    },
  });

  const deleteMutation = trpc.attachment.delete.useMutation({
    onSuccess: () => {
      utils.node.getById.invalidate();
      utils.map.getById.invalidate();
    },
  });

  // Focus URL input when adding source
  useEffect(() => {
    if (isAddingSource) {
      setTimeout(() => sourceUrlInputRef.current?.focus(), 0);
    }
  }, [isAddingSource]);

  // Reset form state when node changes
  useEffect(() => {
    setIsAddingSource(false);
    setNewSourceUrl("");
    setNewSourceError("");
  }, [nodeId]);

  const handleAddSource = useCallback(() => {
    setIsAddingSource(true);
    setNewSourceError("");
  }, []);

  const handleSubmitSource = useCallback(() => {
    const trimmed = newSourceUrl.trim();
    if (!trimmed) {
      setNewSourceError("URL is required");
      return;
    }
    createMutation.mutate({
      nodeId,
      type: "source",
      url: trimmed,
    });
  }, [newSourceUrl, nodeId, createMutation]);

  const handleSourceKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmitSource();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsAddingSource(false);
        setNewSourceUrl("");
        setNewSourceError("");
      }
    },
    [handleSubmitSource],
  );

  const handleAddNote = useCallback(() => {
    createNoteMutation.mutate({
      nodeId,
      type: "note",
      noteText: "New note",
    });
  }, [nodeId, createNoteMutation]);

  const handleRemoveAttachment = useCallback(
    (id: string) => {
      deleteMutation.mutate({ id });
    },
    [deleteMutation],
  );

  const sources = attachments.filter((a) => a.type === "source");
  const notes = attachments.filter((a) => a.type === "note");

  return (
    <section ref={attachmentsRef} data-testid="section-attachments">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Attachments
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleAddSource}
            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            data-testid="add-source-button"
          >
            <Plus className="h-3 w-3" />
            Source
          </button>
          <button
            type="button"
            onClick={handleAddNote}
            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            data-testid="add-note-button"
          >
            <Plus className="h-3 w-3" />
            Note
          </button>
        </div>
      </div>

      {/* Add Source form */}
      {isAddingSource && (
        <div className="mb-2 rounded-md border p-2 space-y-1.5" data-testid="add-source-form">
          <input
            ref={sourceUrlInputRef}
            type="text"
            value={newSourceUrl}
            onChange={(e) => {
              setNewSourceUrl(e.target.value);
              setNewSourceError("");
            }}
            onKeyDown={handleSourceKeyDown}
            placeholder="Enter URL (e.g., example.com)"
            className="w-full rounded border border-border bg-transparent px-2 py-1 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            data-testid="new-source-url-input"
          />
          <div className="flex items-center justify-between">
            <div>
              {newSourceError && (
                <p className="text-xs text-red-500" data-testid="new-source-error">
                  {newSourceError}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsAddingSource(false);
                  setNewSourceUrl("");
                  setNewSourceError("");
                }}
                className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
                data-testid="cancel-add-source"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitSource}
                disabled={createMutation.isPending}
                className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                data-testid="submit-add-source"
              >
                {createMutation.isPending ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment list */}
      {attachments.length > 0 ? (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {/* Sources first, then notes — all in creation order */}
          {attachments.map((attachment) =>
            attachment.type === "source" ? (
              <SourceCard
                key={attachment.id}
                attachment={{
                  id: attachment.id,
                  url: attachment.url ?? null,
                  noteText: attachment.noteText ?? null,
                  previewTitle: attachment.previewTitle ?? null,
                  previewDescription: attachment.previewDescription ?? null,
                  previewImageUrl: attachment.previewImageUrl ?? null,
                  previewFaviconUrl: attachment.previewFaviconUrl ?? null,
                  previewSiteName: attachment.previewSiteName ?? null,
                  previewFetchStatus: attachment.previewFetchStatus ?? null,
                  previewFetchError: attachment.previewFetchError ?? null,
                }}
                onRemove={handleRemoveAttachment}
              />
            ) : (
              <NoteCard
                key={attachment.id}
                attachment={{
                  id: attachment.id,
                  noteText: attachment.noteText ?? null,
                }}
                onRemove={handleRemoveAttachment}
              />
            ),
          )}
        </div>
      ) : !isAddingSource ? (
        <p className="text-sm text-muted-foreground">No attachments.</p>
      ) : null}

      {/* Summary counts */}
      {(sources.length > 0 || notes.length > 0) && (
        <p className="text-xs text-muted-foreground mt-2">
          {sources.length} source{sources.length !== 1 ? "s" : ""}
          {notes.length > 0 && (
            <>, {notes.length} note{notes.length !== 1 ? "s" : ""}</>
          )}
        </p>
      )}
    </section>
  );
}
