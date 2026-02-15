import { useCallback, useEffect, useRef, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import { trpc } from "@/lib/trpc";
import {
  POLARITY_COLORS,
  TAG_COLOR_PALETTE,
  getContrastText,
} from "@/lib/colors";

type Submenu = "polarity" | "addTag" | "removeTag" | null;

interface NodeContextMenuProps {
  mapId: string;
  /** Node data keyed by node ID for looking up parentId, tags, etc. */
  nodes: Map<
    string,
    {
      id: string;
      parentId: string | null;
      tags: Array<{ id: string; name: string; color: string }>;
    }
  >;
  onDeleteRequest: (nodeId: string) => void;
}

export function NodeContextMenu({
  mapId,
  nodes,
  onDeleteRequest,
}: NodeContextMenuProps) {
  const contextMenuState = useUIStore((s) => s.contextMenuState);
  const closeContextMenu = useUIStore((s) => s.closeContextMenu);
  const setInlineEditNodeId = useUIStore((s) => s.setInlineEditNodeId);
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenu, setSubmenu] = useState<Submenu>(null);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState<string>(TAG_COLOR_PALETTE[0]);
  const [newTagError, setNewTagError] = useState("");

  const utils = trpc.useUtils();

  const createNodeMutation = trpc.node.create.useMutation({
    onSuccess: (newNode) => {
      utils.map.getById.invalidate();
      // Activate inline edit on the new node after layout recomputes
      requestAnimationFrame(() => {
        setInlineEditNodeId(newNode.id);
      });
    },
  });

  const updatePolarityMutation = trpc.node.update.useMutation({
    onSuccess: () => {
      utils.map.getById.invalidate();
      utils.node.getById.invalidate();
    },
  });

  const addTagMutation = trpc.tag.addToNode.useMutation({
    onSuccess: () => {
      utils.map.getById.invalidate();
      utils.node.getById.invalidate();
      utils.tag.list.invalidate();
    },
  });

  const removeTagMutation = trpc.tag.removeFromNode.useMutation({
    onSuccess: () => {
      utils.map.getById.invalidate();
      utils.node.getById.invalidate();
      utils.tag.list.invalidate();
    },
  });

  const createTagMutation = trpc.tag.create.useMutation({
    onSuccess: (tag) => {
      if (contextMenuState) {
        addTagMutation.mutate({
          tagId: tag.id,
          nodeId: contextMenuState.nodeId,
        });
      }
      utils.tag.list.invalidate();
      setNewTagName("");
      setNewTagError("");
      setSubmenu(null);
    },
    onError: (err) => {
      setNewTagError(err.message);
    },
  });

  const { data: mapTags } = trpc.tag.list.useQuery(
    { mapId },
    { enabled: !!contextMenuState },
  );

  // Close menu on click outside
  useEffect(() => {
    if (!contextMenuState) return;

    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeContextMenu();
      }
    }

    // Use a timeout so the initial right-click event doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKeyDown);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenuState, closeContextMenu]);

  // Reset submenu state when menu opens/closes
  useEffect(() => {
    setSubmenu(null);
    setNewTagName("");
    setNewTagColor(TAG_COLOR_PALETTE[0]);
    setNewTagError("");
  }, [contextMenuState]);

  const handleAddChild = useCallback(() => {
    if (!contextMenuState) return;
    createNodeMutation.mutate({
      parentId: contextMenuState.nodeId,
      mapId,
    });
    closeContextMenu();
  }, [contextMenuState, mapId, createNodeMutation, closeContextMenu]);

  const handleDelete = useCallback(() => {
    if (!contextMenuState) return;
    onDeleteRequest(contextMenuState.nodeId);
    closeContextMenu();
  }, [contextMenuState, onDeleteRequest, closeContextMenu]);

  const handleSetPolarity = useCallback(
    (polarity: "tailwind" | "headwind" | "neutral") => {
      if (!contextMenuState) return;
      updatePolarityMutation.mutate({
        id: contextMenuState.nodeId,
        polarity,
      });
      closeContextMenu();
    },
    [contextMenuState, updatePolarityMutation, closeContextMenu],
  );

  const handleAddTag = useCallback(
    (tagId: string) => {
      if (!contextMenuState) return;
      addTagMutation.mutate({
        tagId,
        nodeId: contextMenuState.nodeId,
      });
      closeContextMenu();
    },
    [contextMenuState, addTagMutation, closeContextMenu],
  );

  const handleRemoveTag = useCallback(
    (tagId: string) => {
      if (!contextMenuState) return;
      removeTagMutation.mutate({
        tagId,
        nodeId: contextMenuState.nodeId,
      });
      closeContextMenu();
    },
    [contextMenuState, removeTagMutation, closeContextMenu],
  );

  const handleCreateNewTag = useCallback(() => {
    const trimmed = newTagName.trim();
    if (!trimmed) {
      setNewTagError("Tag name is required");
      return;
    }
    createTagMutation.mutate({
      mapId,
      name: trimmed,
      color: newTagColor,
    });
  }, [newTagName, newTagColor, mapId, createTagMutation]);

  if (!contextMenuState) return null;

  const node = nodes.get(contextMenuState.nodeId);
  if (!node) return null;

  const isRoot = node.parentId === null;
  const nodeTags = node.tags;
  const nodeTagIds = new Set(nodeTags.map((t) => t.id));

  // Tags available to add (not already on this node)
  const availableTags = (mapTags ?? []).filter((t) => !nodeTagIds.has(t.id));

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[180px] rounded-md border bg-white py-1 shadow-lg"
      style={{
        left: contextMenuState.x,
        top: contextMenuState.y,
      }}
      data-testid="node-context-menu"
    >
      {/* Add child */}
      <MenuItem
        onClick={handleAddChild}
        data-testid="ctx-add-child"
      >
        <PlusIcon />
        Add child
      </MenuItem>

      {/* Delete */}
      {!isRoot ? (
        <MenuItem
          onClick={handleDelete}
          className="text-red-600 hover:bg-red-50"
          data-testid="ctx-delete"
        >
          <TrashIcon />
          Delete
        </MenuItem>
      ) : (
        <MenuItem
          onClick={handleDelete}
          className="text-red-600 hover:bg-red-50"
          data-testid="ctx-delete-map"
        >
          <TrashIcon />
          Delete map
        </MenuItem>
      )}

      <MenuSeparator />

      {/* Set polarity (hidden for root) */}
      {!isRoot && (
        <div className="relative">
          <MenuItem
            onClick={() =>
              setSubmenu(submenu === "polarity" ? null : "polarity")
            }
            hasSubmenu
            data-testid="ctx-set-polarity"
          >
            <PaletteIcon />
            Set polarity
          </MenuItem>
          {submenu === "polarity" && (
            <SubmenuPanel data-testid="ctx-polarity-submenu">
              <MenuItem
                onClick={() => handleSetPolarity("tailwind")}
                data-testid="ctx-polarity-tailwind"
              >
                <ColorDot color={POLARITY_COLORS.tailwind.border} />
                Tailwind
              </MenuItem>
              <MenuItem
                onClick={() => handleSetPolarity("headwind")}
                data-testid="ctx-polarity-headwind"
              >
                <ColorDot color={POLARITY_COLORS.headwind.border} />
                Headwind
              </MenuItem>
              <MenuItem
                onClick={() => handleSetPolarity("neutral")}
                data-testid="ctx-polarity-neutral"
              >
                <ColorDot color={POLARITY_COLORS.neutral.border} />
                Neutral
              </MenuItem>
            </SubmenuPanel>
          )}
        </div>
      )}

      {/* Add tag */}
      <div className="relative">
        <MenuItem
          onClick={() => setSubmenu(submenu === "addTag" ? null : "addTag")}
          hasSubmenu
          data-testid="ctx-add-tag"
        >
          <TagIcon />
          Add tag
        </MenuItem>
        {submenu === "addTag" && (
          <SubmenuPanel data-testid="ctx-add-tag-submenu">
            {availableTags.length > 0 ? (
              availableTags.map((tag) => (
                <MenuItem
                  key={tag.id}
                  onClick={() => handleAddTag(tag.id)}
                  data-testid={`ctx-add-tag-${tag.id}`}
                >
                  <ColorDot color={tag.color} />
                  {tag.name}
                </MenuItem>
              ))
            ) : (
              <div className="px-3 py-1.5 text-xs text-slate-400">
                No tags available
              </div>
            )}
            <MenuSeparator />
            <div className="px-2 py-1.5">
              <div className="flex items-center gap-1 mb-1">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => {
                    setNewTagName(e.target.value);
                    setNewTagError("");
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateNewTag();
                    }
                  }}
                  placeholder="New tag name..."
                  className="flex-1 rounded border border-slate-300 px-1.5 py-0.5 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  data-testid="ctx-new-tag-name"
                />
                <button
                  type="button"
                  onClick={handleCreateNewTag}
                  className="rounded bg-blue-500 px-1.5 py-0.5 text-xs text-white hover:bg-blue-600"
                  data-testid="ctx-new-tag-create"
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
                    className="h-4 w-4 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor:
                        newTagColor === color ? "#1e293b" : "transparent",
                    }}
                    title={color}
                    data-testid={`ctx-new-tag-color-${color}`}
                  />
                ))}
              </div>
              {newTagError && (
                <p className="mt-1 text-xs text-red-500" data-testid="ctx-new-tag-error">
                  {newTagError}
                </p>
              )}
            </div>
          </SubmenuPanel>
        )}
      </div>

      {/* Remove tag (only shown if node has tags) */}
      {nodeTags.length > 0 && (
        <div className="relative">
          <MenuItem
            onClick={() =>
              setSubmenu(submenu === "removeTag" ? null : "removeTag")
            }
            hasSubmenu
            data-testid="ctx-remove-tag"
          >
            <TagOffIcon />
            Remove tag
          </MenuItem>
          {submenu === "removeTag" && (
            <SubmenuPanel data-testid="ctx-remove-tag-submenu">
              {nodeTags.map((tag) => (
                <MenuItem
                  key={tag.id}
                  onClick={() => handleRemoveTag(tag.id)}
                  data-testid={`ctx-remove-tag-${tag.id}`}
                >
                  <span
                    className="inline-flex items-center rounded-full px-1.5 py-px text-[9px] font-medium"
                    style={{
                      backgroundColor: tag.color,
                      color: getContrastText(tag.color),
                    }}
                  >
                    {tag.name}
                  </span>
                </MenuItem>
              ))}
            </SubmenuPanel>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function MenuItem({
  onClick,
  children,
  className = "",
  hasSubmenu = false,
  ...rest
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  hasSubmenu?: boolean;
  "data-testid"?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-100 transition-colors ${className}`}
      {...rest}
    >
      <span className="flex flex-1 items-center gap-2">{children}</span>
      {hasSubmenu && <ChevronRightIcon />}
    </button>
  );
}

function SubmenuPanel({
  children,
  ...rest
}: {
  children: React.ReactNode;
  "data-testid"?: string;
}) {
  return (
    <div
      className="absolute left-full top-0 z-[101] min-w-[160px] max-h-[300px] overflow-y-auto rounded-md border bg-white py-1 shadow-lg"
      {...rest}
    >
      {children}
    </div>
  );
}

function MenuSeparator() {
  return <div className="my-1 border-t border-slate-200" />;
}

function ColorDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-3 w-3 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

// ---------------------------------------------------------------------------
// Icons (inline SVGs to avoid a dependency)
// ---------------------------------------------------------------------------

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
      <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M2 8a6 6 0 1 1 10.735 3.674l-.494-.494A2.876 2.876 0 0 0 10.2 10H9.2a1.5 1.5 0 0 1-1.5-1.5v-.15a1 1 0 1 0-2 0V8.5A1.5 1.5 0 0 1 4.2 10H3.756A6.018 6.018 0 0 1 2 8Zm4.5-3.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM5 6.5a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm8 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
      <path fillRule="evenodd" d="M4.5 2A2.5 2.5 0 0 0 2 4.5v2.879a2.5 2.5 0 0 0 .732 1.767l4.5 4.5a2.5 2.5 0 0 0 3.536 0l2.878-2.878a2.5 2.5 0 0 0 0-3.536l-4.5-4.5A2.5 2.5 0 0 0 7.378 2H4.5ZM5 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
    </svg>
  );
}

function TagOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
      <path fillRule="evenodd" d="M4.5 2A2.5 2.5 0 0 0 2 4.5v2.879a2.5 2.5 0 0 0 .732 1.767l4.5 4.5a2.5 2.5 0 0 0 3.536 0l2.878-2.878a2.5 2.5 0 0 0 0-3.536l-4.5-4.5A2.5 2.5 0 0 0 7.378 2H4.5ZM5 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-slate-400">
      <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
  );
}
