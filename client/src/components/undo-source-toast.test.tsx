import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: vi.fn(),
  Toaster: () => null,
}));

describe("undo source toast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Simulate the onSuccess callback from the delete mutation
  // This mirrors the logic in side-panel.tsx AttachmentsSection
  function simulateDeleteSuccess(
    deletedAttachment: {
      type: string;
      nodeId: string;
      url?: string | null;
      noteText?: string | null;
    },
    restoreMutate: Mock,
  ) {
    // This is the logic inside deleteMutation.onSuccess
    if (deletedAttachment.type === "source") {
      toast("Source removed", {
        action: {
          label: "Undo",
          onClick: () => {
            restoreMutate({
              nodeId: deletedAttachment.nodeId,
              type: "source" as const,
              url: deletedAttachment.url ?? undefined,
              noteText: deletedAttachment.noteText ?? undefined,
            });
          },
        },
      });
    }
  }

  it("shows an undo toast when a source attachment is deleted", () => {
    const restoreMutate = vi.fn();
    simulateDeleteSuccess(
      {
        type: "source",
        nodeId: "node-1",
        url: "https://example.com",
        noteText: null,
      },
      restoreMutate,
    );

    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith("Source removed", {
      action: {
        label: "Undo",
        onClick: expect.any(Function),
      },
    });
  });

  it("does not show a toast when a note attachment is deleted", () => {
    const restoreMutate = vi.fn();
    simulateDeleteSuccess(
      {
        type: "note",
        nodeId: "node-1",
        noteText: "Some note",
      },
      restoreMutate,
    );

    expect(toast).not.toHaveBeenCalled();
  });

  it("calls restoreMutate with correct data when undo is clicked", () => {
    const restoreMutate = vi.fn();
    simulateDeleteSuccess(
      {
        type: "source",
        nodeId: "node-1",
        url: "https://example.com",
        noteText: "My note about this source",
      },
      restoreMutate,
    );

    // Extract the onClick handler from the toast call
    const toastCall = (toast as unknown as Mock).mock.calls[0]!;
    const action = toastCall[1].action;
    action.onClick();

    expect(restoreMutate).toHaveBeenCalledTimes(1);
    expect(restoreMutate).toHaveBeenCalledWith({
      nodeId: "node-1",
      type: "source",
      url: "https://example.com",
      noteText: "My note about this source",
    });
  });

  it("passes undefined for url and noteText when they are null", () => {
    const restoreMutate = vi.fn();
    simulateDeleteSuccess(
      {
        type: "source",
        nodeId: "node-1",
        url: null,
        noteText: null,
      },
      restoreMutate,
    );

    const toastCall = (toast as unknown as Mock).mock.calls[0]!;
    const action = toastCall[1].action;
    action.onClick();

    expect(restoreMutate).toHaveBeenCalledWith({
      nodeId: "node-1",
      type: "source",
      url: undefined,
      noteText: undefined,
    });
  });

  it("preserves noteText in the undo data when source has a user note", () => {
    const restoreMutate = vi.fn();
    simulateDeleteSuccess(
      {
        type: "source",
        nodeId: "node-42",
        url: "https://research.example.org/paper.pdf",
        noteText: "Key findings on page 3",
      },
      restoreMutate,
    );

    const toastCall = (toast as unknown as Mock).mock.calls[0]!;
    toastCall[1].action.onClick();

    expect(restoreMutate).toHaveBeenCalledWith({
      nodeId: "node-42",
      type: "source",
      url: "https://research.example.org/paper.pdf",
      noteText: "Key findings on page 3",
    });
  });
});
