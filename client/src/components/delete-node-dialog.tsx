import { useCallback, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui-store";

interface DeleteNodeDialogProps {
  nodeId: string | null;
  onClose: () => void;
}

export function DeleteNodeDialog({ nodeId, onClose }: DeleteNodeDialogProps) {
  const [descendantCount, setDescendantCount] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const clearSelection = useUIStore((s) => s.clearSelection);

  const utils = trpc.useUtils();

  const deleteMutation = trpc.node.delete.useMutation({
    onSuccess: (result) => {
      if (result.status === "pending") {
        setDescendantCount(result.descendantCount);
      } else if (result.status === "deleted") {
        utils.map.getById.invalidate();
        utils.node.getById.invalidate();
        utils.tag.list.invalidate();
        clearSelection();
        onClose();
      }
    },
    onError: () => {
      setIsDeleting(false);
    },
  });

  // When the dialog opens with a new nodeId, fetch descendant count
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose();
        setDescendantCount(null);
        setIsDeleting(false);
        return;
      }
      if (nodeId) {
        deleteMutation.mutate({ id: nodeId, confirm: false });
      }
    },
    [nodeId, deleteMutation, onClose],
  );

  const handleConfirmDelete = useCallback(() => {
    if (!nodeId) return;
    setIsDeleting(true);
    deleteMutation.mutate({ id: nodeId, confirm: true });
  }, [nodeId, deleteMutation]);

  const isOpen = nodeId !== null;

  // Trigger the initial count fetch when dialog opens
  if (isOpen && descendantCount === null && !deleteMutation.isPending) {
    deleteMutation.mutate({ id: nodeId, confirm: false });
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete node?</DialogTitle>
          <DialogDescription>
            {descendantCount === null ? (
              "Checking for descendants..."
            ) : descendantCount === 0 ? (
              "This will permanently delete this node. This action cannot be undone."
            ) : (
              <>
                This will permanently delete this node and its{" "}
                <strong>
                  {descendantCount} descendant{descendantCount === 1 ? "" : "s"}
                </strong>
                . This action cannot be undone.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmDelete}
            disabled={descendantCount === null || isDeleting}
            data-testid="confirm-delete-node"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
