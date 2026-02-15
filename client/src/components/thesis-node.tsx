import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import {
  getPolarityColors,
  getContrastText,
  POLARITY_COLORS,
  SELECTION_RING_COLOR,
} from "@/lib/colors";
import { useUIStore } from "@/stores/ui-store";
import { trpc } from "@/lib/trpc";

export type ThesisNodeData = Record<string, unknown> & {
  label: string;
  node: {
    id: string;
    parentId: string | null;
    statement: string;
    polarity: string | null;
    strength: number | null;
    tags: Array<{ id: string; name: string; color: string }>;
    attachments: Array<{ id: string; type: string }>;
    aggregation: {
      tailwindTotal: number;
      headwindTotal: number;
      balanceRatio: number;
    } | null;
  };
};

export type ThesisNodeType = Node<ThesisNodeData, "thesis">;

function ThesisNodeComponent({ data, selected }: NodeProps<ThesisNodeType>) {
  const { node } = data;
  const isRoot = node.parentId === null;
  const colors = getPolarityColors(node.polarity);

  const sourceCount = node.attachments.filter((a) => a.type === "source").length;

  const selectNode = useUIStore((s) => s.selectNode);
  const openSidePanel = useUIStore((s) => s.openSidePanel);
  const inlineEditNodeId = useUIStore((s) => s.inlineEditNodeId);
  const setInlineEditNodeId = useUIStore((s) => s.setInlineEditNodeId);

  const isEditing = inlineEditNodeId === node.id;
  const [editValue, setEditValue] = useState(node.statement);
  const inputRef = useRef<HTMLInputElement>(null);
  const isConfirming = useRef(false);

  const utils = trpc.useUtils();
  const updateMutation = trpc.node.update.useMutation({
    onSuccess: () => {
      // Invalidate queries so the tree refreshes with the new statement
      utils.map.getById.invalidate();
      utils.node.getById.invalidate();
    },
  });

  // When entering edit mode, sync the edit value and focus the input
  useEffect(() => {
    if (isEditing) {
      setEditValue(node.statement);
      // Focus after React renders the input
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isEditing, node.statement]);

  const confirmEdit = useCallback(() => {
    // Guard against double-confirm (blur can fire after Enter)
    if (isConfirming.current) return;
    isConfirming.current = true;

    const trimmed = editValue.trim();
    setInlineEditNodeId(null);

    // Only mutate if the statement actually changed
    if (trimmed !== node.statement) {
      updateMutation.mutate({ id: node.id, statement: trimmed });
    }

    // Reset the guard after the current event loop
    requestAnimationFrame(() => {
      isConfirming.current = false;
    });
  }, [editValue, node.id, node.statement, setInlineEditNodeId, updateMutation]);

  const cancelEdit = useCallback(() => {
    setEditValue(node.statement);
    setInlineEditNodeId(null);
  }, [node.statement, setInlineEditNodeId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        confirmEdit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
      }
    },
    [confirmEdit, cancelEdit],
  );

  const handleSourceBadgeClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      selectNode(node.id);
      openSidePanel("attachments");
    },
    [node.id, selectNode, openSidePanel],
  );

  return (
    <div
      className="relative flex flex-col gap-1 rounded-lg border-2 bg-white px-3 py-2 shadow-sm"
      style={{
        borderColor: colors.border,
        backgroundColor: colors.bg,
        minWidth: 160,
        maxWidth: 220,
        boxShadow: selected
          ? `0 0 0 3px ${SELECTION_RING_COLOR}`
          : undefined,
      }}
    >
      {/* Target handle (incoming edge from parent) */}
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-transparent !border-none !w-0 !h-0"
        />
      )}

      {/* Source handle (outgoing edge to children) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-transparent !border-none !w-0 !h-0"
      />

      {/* Statement text — inline edit or static display */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={confirmEdit}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="nodrag nopan nowheel w-full rounded border border-blue-400 bg-white px-1 py-0.5 text-xs font-medium leading-snug outline-none focus:ring-1 focus:ring-blue-400"
          style={{ color: colors.text }}
          data-testid="inline-edit-input"
        />
      ) : (
        <p
          className="text-xs font-medium leading-snug"
          style={{
            color: colors.text,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
          }}
          title={node.statement || "(untitled)"}
        >
          {node.statement || "(untitled)"}
        </p>
      )}

      {/* Tag chips */}
      {node.tags.length > 0 && (
        <div className="flex flex-wrap gap-0.5">
          {node.tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center rounded-full px-1.5 py-px text-[9px] font-medium leading-tight"
              style={{
                backgroundColor: tag.color,
                color: getContrastText(tag.color),
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Balance bar */}
      {node.aggregation && (
        <BalanceBar aggregation={node.aggregation} />
      )}

      {/* Source count badge */}
      {sourceCount > 0 && (
        <button
          type="button"
          onClick={handleSourceBadgeClick}
          className="absolute -bottom-1 -right-1 flex items-center gap-0.5 rounded-full bg-slate-100 border border-slate-300 px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          title={`${sourceCount} source${sourceCount === 1 ? "" : "s"}`}
        >
          <LinkIcon />
          <span>{sourceCount >= 100 ? "99+" : sourceCount}</span>
        </button>
      )}
    </div>
  );
}

function BalanceBar({
  aggregation,
}: {
  aggregation: { tailwindTotal: number; headwindTotal: number; balanceRatio: number };
}) {
  const tailwindPct = Math.round(aggregation.balanceRatio * 100);
  const headwindPct = 100 - tailwindPct;

  return (
    <div className="mt-0.5">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full">
        <div
          className="transition-all duration-300"
          style={{
            width: `${tailwindPct}%`,
            backgroundColor: POLARITY_COLORS.tailwind.bar,
          }}
        />
        <div
          className="transition-all duration-300"
          style={{
            width: `${headwindPct}%`,
            backgroundColor: POLARITY_COLORS.headwind.bar,
          }}
        />
      </div>
    </div>
  );
}

function LinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-2.5 w-2.5"
    >
      <path
        fillRule="evenodd"
        d="M8.914 6.025a.75.75 0 0 1 1.06 0 3.5 3.5 0 0 1 0 4.95l-2 2a3.5 3.5 0 0 1-4.95-4.95l1.25-1.25a.75.75 0 0 1 1.06 1.06l-1.25 1.25a2 2 0 1 0 2.83 2.83l2-2a2 2 0 0 0 0-2.83.75.75 0 0 1 0-1.06Zm-1.828 3.95a.75.75 0 0 1-1.06 0 3.5 3.5 0 0 1 0-4.95l2-2a3.5 3.5 0 0 1 4.95 4.95l-1.25 1.25a.75.75 0 1 1-1.06-1.06l1.25-1.25a2 2 0 1 0-2.83-2.83l-2 2a2 2 0 0 0 0 2.83.75.75 0 0 1 0 1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export const ThesisNode = memo(ThesisNodeComponent);
