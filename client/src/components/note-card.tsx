import { useState, useCallback, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useDebouncedMutation } from "@/hooks/use-debounced-mutation";

interface NoteAttachment {
  id: string;
  noteText: string | null;
}

interface NoteCardProps {
  attachment: NoteAttachment;
  onRemove: (id: string) => void;
}

export function NoteCard({ attachment, onRemove }: NoteCardProps) {
  const [noteValue, setNoteValue] = useState(attachment.noteText ?? "");
  const utils = trpc.useUtils();

  const updateMutation = trpc.attachment.update.useMutation();

  const debouncedNoteUpdate = useDebouncedMutation(updateMutation, {
    delay: 1500,
    onSuccess: () => {
      utils.node.getById.invalidate();
      utils.map.getById.invalidate();
    },
  });

  // Sync with server data
  useEffect(() => {
    setNoteValue(attachment.noteText ?? "");
  }, [attachment.noteText]);

  const handleNoteChange = useCallback(
    (value: string) => {
      setNoteValue(value);
      debouncedNoteUpdate.mutate({ id: attachment.id, noteText: value });
    },
    [attachment.id, debouncedNoteUpdate],
  );

  return (
    <div
      className="rounded-md border bg-card text-card-foreground"
      data-testid={`note-card-${attachment.id}`}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Note
          </span>
          <button
            type="button"
            onClick={() => onRemove(attachment.id)}
            className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
            aria-label="Remove note"
            title="Remove"
            data-testid={`note-remove-${attachment.id}`}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
        <textarea
          value={noteValue}
          onChange={(e) => handleNoteChange(e.target.value)}
          placeholder="Enter note text..."
          rows={3}
          className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-sm outline-none resize-y focus:border-ring focus:ring-1 focus:ring-ring"
          data-testid={`note-text-input-${attachment.id}`}
        />
      </div>
    </div>
  );
}
