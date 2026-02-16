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

interface DeleteMapDialogProps {
  mapId: string | null;
  mapName: string;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteMapDialog({
  mapId,
  mapName,
  onClose,
  onDeleted,
}: DeleteMapDialogProps) {
  const utils = trpc.useUtils();

  const deleteMutation = trpc.map.delete.useMutation({
    onSuccess: () => {
      utils.map.list.invalidate();
      onDeleted();
    },
  });

  const isOpen = mapId !== null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete map?</DialogTitle>
          <DialogDescription>
            This will permanently delete the map{" "}
            <strong>&quot;{mapName}&quot;</strong> and all its nodes, tags, and
            attachments. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (mapId) deleteMutation.mutate({ id: mapId });
            }}
            disabled={deleteMutation.isPending}
            data-testid="confirm-delete-map"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete map"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
