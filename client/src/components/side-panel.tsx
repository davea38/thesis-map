import { useEffect, useRef, useCallback, useState } from "react";
import { X } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { trpc } from "@/lib/trpc";
import { getPolarityColors } from "@/lib/colors";
import { useDebouncedMutation } from "@/hooks/use-debounced-mutation";

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

  // Sync local statement with server data when node changes
  useEffect(() => {
    if (nodeData) {
      setStatementValue(nodeData.statement);
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

  const handleStatementChange = useCallback(
    (value: string) => {
      setStatementValue(value);
      if (selectedNodeId) {
        debouncedStatementUpdate.mutate({ id: selectedNodeId, statement: value });
      }
    },
    [selectedNodeId, debouncedStatementUpdate],
  );

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
                  Body
                </h3>
                <p className="text-sm text-muted-foreground">
                  {node.body || "No body text."}
                </p>
              </section>

              {/* Strength & Polarity (hidden for root) */}
              {!isRoot && (
                <section data-testid="section-properties">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Properties
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Strength</span>
                      <span>{node.strength ?? 0}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Polarity</span>
                      <span className="capitalize">{node.polarity ?? "neutral"}</span>
                    </div>
                  </div>
                </section>
              )}

              {/* Tags section */}
              <section data-testid="section-tags">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Tags
                </h3>
                {node.tags && node.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {node.tags.map((tag: { id: string; name: string; color: string }) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: tag.color, color: "#fff" }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No tags.</p>
                )}
              </section>

              {/* Attachments section */}
              <section ref={attachmentsRef} data-testid="section-attachments">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Attachments
                </h3>
                {node.attachments && node.attachments.length > 0 ? (
                  <div className="space-y-2">
                    {node.attachments.map((attachment: { id: string; type: string; url?: string | null; noteText?: string | null }) => (
                      <div
                        key={attachment.id}
                        className="rounded-md border p-2 text-sm"
                      >
                        {attachment.type === "source" ? (
                          <span className="text-muted-foreground truncate block">
                            {attachment.url || "No URL"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {attachment.noteText || "Empty note"}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No attachments.</p>
                )}
              </section>

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
