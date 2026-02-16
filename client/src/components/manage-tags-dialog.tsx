import { useState, useEffect, useCallback } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { TAG_COLOR_PALETTE, getContrastText } from "@/lib/colors";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TagData {
  id: string;
  mapId: string;
  name: string;
  color: string;
  nodeCount: number;
}

export function ManageTagsDialog({
  mapId,
  children,
}: {
  mapId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editError, setEditError] = useState("");
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: tags } = trpc.tag.list.useQuery(
    { mapId },
    { enabled: open },
  );

  const updateTagMutation = trpc.tag.update.useMutation({
    onSuccess: () => {
      utils.tag.list.invalidate();
      utils.node.getById.invalidate();
      utils.map.getById.invalidate();
      setEditingTagId(null);
      setEditError("");
    },
    onError: (err) => {
      setEditError(err.message);
    },
  });

  const deleteTagMutation = trpc.tag.delete.useMutation({
    onSuccess: () => {
      utils.tag.list.invalidate();
      utils.node.getById.invalidate();
      utils.map.getById.invalidate();
      setDeletingTagId(null);
    },
  });

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setEditingTagId(null);
      setEditName("");
      setEditColor("");
      setEditError("");
      setDeletingTagId(null);
    }
  }, [open]);

  const startEdit = useCallback((tag: TagData) => {
    setEditingTagId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
    setEditError("");
    setDeletingTagId(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingTagId(null);
    setEditName("");
    setEditColor("");
    setEditError("");
  }, []);

  const confirmEdit = useCallback(() => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError("Tag name is required");
      return;
    }
    if (!editingTagId) return;
    updateTagMutation.mutate({
      id: editingTagId,
      name: trimmed,
      color: editColor as typeof TAG_COLOR_PALETTE[number],
    });
  }, [editingTagId, editName, editColor, updateTagMutation]);

  const requestDelete = useCallback((tagId: string) => {
    setDeletingTagId(tagId);
    setEditingTagId(null);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deletingTagId) return;
    deleteTagMutation.mutate({ id: deletingTagId });
  }, [deletingTagId, deleteTagMutation]);

  const cancelDelete = useCallback(() => {
    setDeletingTagId(null);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
          <DialogDescription>
            Rename, recolor, or delete tags for this map. Changes apply across all nodes.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 max-h-80 overflow-y-auto" data-testid="manage-tags-list">
          {!tags || tags.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center" data-testid="manage-tags-empty">
              No tags in this map yet.
            </p>
          ) : (
            <div className="space-y-1">
              {tags.map((tag: TagData) => (
                <div key={tag.id}>
                  {editingTagId === tag.id ? (
                    <div
                      className="rounded-md border p-2 space-y-2"
                      data-testid={`tag-edit-form-${tag.id}`}
                    >
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => {
                            setEditName(e.target.value);
                            setEditError("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              confirmEdit();
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              cancelEdit();
                            }
                          }}
                          className="flex-1 rounded border border-border px-2 py-1 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                          data-testid={`tag-edit-name-${tag.id}`}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={confirmEdit}
                          disabled={updateTagMutation.isPending}
                          className="rounded p-1 text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                          aria-label="Confirm edit"
                          data-testid={`tag-edit-confirm-${tag.id}`}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded p-1 text-muted-foreground hover:bg-accent transition-colors"
                          aria-label="Cancel edit"
                          data-testid={`tag-edit-cancel-${tag.id}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {TAG_COLOR_PALETTE.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEditColor(color)}
                            className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110"
                            style={{
                              backgroundColor: color,
                              borderColor:
                                editColor === color ? "#1e293b" : "transparent",
                            }}
                            title={color}
                            data-testid={`tag-edit-color-${color}`}
                          />
                        ))}
                      </div>
                      {editError && (
                        <p className="text-xs text-red-500" data-testid={`tag-edit-error-${tag.id}`}>
                          {editError}
                        </p>
                      )}
                    </div>
                  ) : deletingTagId === tag.id ? (
                    <div
                      className="rounded-md border border-red-200 bg-red-50 p-2"
                      data-testid={`tag-delete-confirm-${tag.id}`}
                    >
                      <p className="text-sm text-red-800 mb-2">
                        Delete &quot;{tag.name}&quot;?
                        {tag.nodeCount > 0 && (
                          <span>
                            {" "}This will remove it from {tag.nodeCount} node{tag.nodeCount !== 1 ? "s" : ""}.
                          </span>
                        )}
                      </p>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={confirmDelete}
                          disabled={deleteTagMutation.isPending}
                          className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                          data-testid={`tag-delete-yes-${tag.id}`}
                        >
                          {deleteTagMutation.isPending ? "Deleting..." : "Delete"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelDelete}
                          className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"
                          data-testid={`tag-delete-no-${tag.id}`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors group"
                      data-testid={`manage-tag-row-${tag.id}`}
                    >
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: tag.color,
                          color: getContrastText(tag.color),
                        }}
                        data-testid={`manage-tag-chip-${tag.id}`}
                      >
                        {tag.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {tag.nodeCount} node{tag.nodeCount !== 1 ? "s" : ""}
                      </span>
                      <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => startEdit(tag)}
                          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          aria-label={`Edit tag ${tag.name}`}
                          data-testid={`manage-tag-edit-${tag.id}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDelete(tag.id)}
                          className="rounded p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                          aria-label={`Delete tag ${tag.name}`}
                          data-testid={`manage-tag-delete-${tag.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
