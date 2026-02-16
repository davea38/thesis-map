import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { httpBatchLink } from "@trpc/client";
import { ManageTagsDialog } from "./manage-tags-dialog";

const mockMapTags = [
  { id: "t1", mapId: "map-1", name: "Economic", color: "#3b82f6", nodeCount: 3 },
  { id: "t2", mapId: "map-1", name: "Technical", color: "#ef4444", nodeCount: 0 },
  { id: "t3", mapId: "map-1", name: "Political", color: "#22c55e", nodeCount: 1 },
];

function renderDialog(options?: {
  mapTags?: typeof mockMapTags | null;
  mapId?: string;
}) {
  const { mapTags = mockMapTags, mapId = "map-1" } = options ?? {};

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  if (mapTags) {
    queryClient.setQueryData(
      [["tag", "list"], { input: { mapId }, type: "query" }],
      mapTags,
    );
  }

  const trpcClient = trpc.createClient({
    links: [httpBatchLink({ url: "http://localhost:4000/trpc" })],
  });

  const user = userEvent.setup();

  const result = render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ManageTagsDialog mapId={mapId}>
          <button data-testid="trigger">Manage Tags</button>
        </ManageTagsDialog>
      </QueryClientProvider>
    </trpc.Provider>,
  );

  return { ...result, user, queryClient };
}

describe("ManageTagsDialog", () => {
  describe("dialog open/close", () => {
    it("opens dialog when trigger is clicked", async () => {
      const { user } = renderDialog();

      expect(screen.queryByTestId("manage-tags-list")).not.toBeInTheDocument();

      await user.click(screen.getByTestId("trigger"));

      expect(screen.getByTestId("manage-tags-list")).toBeInTheDocument();
      expect(screen.getByText(/Rename, recolor, or delete tags/)).toBeInTheDocument();
    });

    it("shows list of all tags in the map", async () => {
      const { user } = renderDialog();

      await user.click(screen.getByTestId("trigger"));

      expect(screen.getByTestId("manage-tag-row-t1")).toBeInTheDocument();
      expect(screen.getByTestId("manage-tag-row-t2")).toBeInTheDocument();
      expect(screen.getByTestId("manage-tag-row-t3")).toBeInTheDocument();
    });

    it("shows empty state when no tags exist", async () => {
      const { user } = renderDialog({ mapTags: [] });

      await user.click(screen.getByTestId("trigger"));

      expect(screen.getByTestId("manage-tags-empty")).toBeInTheDocument();
      expect(screen.getByText("No tags in this map yet.")).toBeInTheDocument();
    });
  });

  describe("tag display", () => {
    it("shows tag name as colored chip", async () => {
      const { user } = renderDialog();

      await user.click(screen.getByTestId("trigger"));

      const chip = screen.getByTestId("manage-tag-chip-t1");
      expect(chip).toHaveTextContent("Economic");
      expect(chip.style.backgroundColor).toBeTruthy();
    });

    it("shows node count for each tag", async () => {
      const { user } = renderDialog();

      await user.click(screen.getByTestId("trigger"));

      const row1 = screen.getByTestId("manage-tag-row-t1");
      expect(within(row1).getByText("3 nodes")).toBeInTheDocument();

      const row2 = screen.getByTestId("manage-tag-row-t2");
      expect(within(row2).getByText("0 nodes")).toBeInTheDocument();

      const row3 = screen.getByTestId("manage-tag-row-t3");
      expect(within(row3).getByText("1 node")).toBeInTheDocument();
    });

    it("shows edit and delete action buttons for each tag", async () => {
      const { user } = renderDialog();

      await user.click(screen.getByTestId("trigger"));

      expect(screen.getByTestId("manage-tag-edit-t1")).toBeInTheDocument();
      expect(screen.getByTestId("manage-tag-delete-t1")).toBeInTheDocument();
      expect(screen.getByLabelText("Edit tag Economic")).toBeInTheDocument();
      expect(screen.getByLabelText("Delete tag Economic")).toBeInTheDocument();
    });
  });

  describe("tag editing", () => {
    it("shows edit form when edit button is clicked", async () => {
      const { user } = renderDialog();

      await user.click(screen.getByTestId("trigger"));
      await user.click(screen.getByTestId("manage-tag-edit-t1"));

      expect(screen.getByTestId("tag-edit-form-t1")).toBeInTheDocument();
      const nameInput = screen.getByTestId("tag-edit-name-t1") as HTMLInputElement;
      expect(nameInput.value).toBe("Economic");
    });

    it("shows color picker in edit form", async () => {
      const { user } = renderDialog();

      await user.click(screen.getByTestId("trigger"));
      await user.click(screen.getByTestId("manage-tag-edit-t1"));

      const colorButtons = screen.getAllByTestId(/^tag-edit-color-/);
      expect(colorButtons).toHaveLength(10);
    });

    it("highlights the current tag color in edit form", async () => {
      const { user } = renderDialog();

      await user.click(screen.getByTestId("trigger"));
      await user.click(screen.getByTestId("manage-tag-edit-t1"));

      // Blue (#3b82f6) should be highlighted
      const blueColor = screen.getByTestId("tag-edit-color-#3b82f6");
      expect(blueColor.style.borderColor).toMatch(/^(#1e293b|rgb\(30,\s*41,\s*59\))$/);

      // Other colors should be transparent
      const redColor = screen.getByTestId("tag-edit-color-#ef4444");
      expect(redColor.style.borderColor).toBe("transparent");
    });

    it("allows changing the color in edit form", async () => {
      const { user } = renderDialog();

      await user.click(screen.getByTestId("trigger"));
      await user.click(screen.getByTestId("manage-tag-edit-t1"));

      const redColor = screen.getByTestId("tag-edit-color-#ef4444");
      await user.click(redColor);

      expect(redColor.style.borderColor).toMatch(/^(#1e293b|rgb\(30,\s*41,\s*59\))$/);
      const blueColor = screen.getByTestId("tag-edit-color-#3b82f6");
      expect(blueColor.style.borderColor).toBe("transparent");
    });

    it("shows confirm and cancel buttons in edit form", async () => {
      const { user } = renderDialog();

      await user.click(screen.getByTestId("trigger"));
      await user.click(screen.getByTestId("manage-tag-edit-t1"));

      expect(screen.getByTestId("tag-edit-confirm-t1")).toBeInTheDocument();
      expect(screen.getByTestId("tag-edit-cancel-t1")).toBeInTheDocument();
      expect(screen.getByLabelText("Confirm edit")).toBeInTheDocument();
      expect(screen.getByLabelText("Cancel edit")).toBeInTheDocument();
    });

    it("cancels editing when cancel button is clicked", async () => {
      const { user } = renderDialog();

      await user.click(screen.getByTestId("trigger"));
      await user.click(screen.getByTestId("manage-tag-edit-t1"));
      expect(screen.getByTestId("tag-edit-form-t1")).toBeInTheDocument();

      await user.click(screen.getByTestId("tag-edit-cancel-t1"));
      expect(screen.queryByTestId("tag-edit-form-t1")).not.toBeInTheDocument();
      expect(screen.getByTestId("manage-tag-row-t1")).toBeInTheDocument();
    });

    it("shows error when confirming with empty name", async () => {
      const { user } = renderDialog();

      await user.click(screen.getByTestId("trigger"));
      await user.click(screen.getByTestId("manage-tag-edit-t1"));

      const nameInput = screen.getByTestId("tag-edit-name-t1");
      await user.clear(nameInput);
      await user.click(screen.getByTestId("tag-edit-confirm-t1"));

      expect(screen.getByTestId("tag-edit-error-t1")).toBeInTheDocument();
      expect(screen.getByText("Tag name is required")).toBeInTheDocument();
    });

    it("clears error when typing in name input", async () => {
      const { user } = renderDialog();

      await user.click(screen.getByTestId("trigger"));
      await user.click(screen.getByTestId("manage-tag-edit-t1"));

      const nameInput = screen.getByTestId("tag-edit-name-t1");
      await user.clear(nameInput);
      await user.click(screen.getByTestId("tag-edit-confirm-t1"));
      expect(screen.getByTestId("tag-edit-error-t1")).toBeInTheDocument();

      await user.type(nameInput, "N");
      expect(screen.queryByTestId("tag-edit-error-t1")).not.toBeInTheDocument();
    });

    it("cancels edit when Escape is pressed in name input", async () => {
      const { user } = renderDialog();

      await user.click(screen.getByTestId("trigger"));
      await user.click(screen.getByTestId("manage-tag-edit-t1"));
      expect(screen.getByTestId("tag-edit-form-t1")).toBeInTheDocument();

      await user.keyboard("{Escape}");
      expect(screen.queryByTestId("tag-edit-form-t1")).not.toBeInTheDocument();
    });

    it("only edits one tag at a time", async () => {
      const { user } = renderDialog();

      await user.click(screen.getByTestId("trigger"));
      await user.click(screen.getByTestId("manage-tag-edit-t1"));
      expect(screen.getByTestId("tag-edit-form-t1")).toBeInTheDocument();

      // Click edit on another tag
      await user.click(screen.getByTestId("manage-tag-edit-t2"));
      expect(screen.queryByTestId("tag-edit-form-t1")).not.toBeInTheDocument();
      expect(screen.getByTestId("tag-edit-form-t2")).toBeInTheDocument();
    });
  });

  describe("tag deletion", () => {
    it("shows delete confirmation when delete button is clicked", async () => {
      const { user } = renderDialog();

      await user.click(screen.getByTestId("trigger"));
      await user.click(screen.getByTestId("manage-tag-delete-t1"));

      expect(screen.getByTestId("tag-delete-confirm-t1")).toBeInTheDocument();
    });

    it("shows node count warning in delete confirmation", async () => {
      const { user } = renderDialog();

      await user.click(screen.getByTestId("trigger"));
      await user.click(screen.getByTestId("manage-tag-delete-t1"));

      expect(screen.getByText(/This will remove it from 3 nodes/)).toBeInTheDocument();
    });

    it("shows singular node count in delete confirmation", async () => {
      const { user } = renderDialog();

      await user.click(screen.getByTestId("trigger"));
      await user.click(screen.getByTestId("manage-tag-delete-t3"));

      expect(screen.getByText(/This will remove it from 1 node\./)).toBeInTheDocument();
    });

    it("does not show node count warning when tag has 0 nodes", async () => {
      const { user } = renderDialog();

      await user.click(screen.getByTestId("trigger"));
      await user.click(screen.getByTestId("manage-tag-delete-t2"));

      const confirmBox = screen.getByTestId("tag-delete-confirm-t2");
      expect(within(confirmBox).queryByText(/This will remove it from/)).not.toBeInTheDocument();
    });

    it("shows Delete and Cancel buttons in delete confirmation", async () => {
      const { user } = renderDialog();

      await user.click(screen.getByTestId("trigger"));
      await user.click(screen.getByTestId("manage-tag-delete-t1"));

      expect(screen.getByTestId("tag-delete-yes-t1")).toBeInTheDocument();
      expect(screen.getByTestId("tag-delete-no-t1")).toBeInTheDocument();
    });

    it("cancels deletion when cancel button is clicked", async () => {
      const { user } = renderDialog();

      await user.click(screen.getByTestId("trigger"));
      await user.click(screen.getByTestId("manage-tag-delete-t1"));
      expect(screen.getByTestId("tag-delete-confirm-t1")).toBeInTheDocument();

      await user.click(screen.getByTestId("tag-delete-no-t1"));
      expect(screen.queryByTestId("tag-delete-confirm-t1")).not.toBeInTheDocument();
      expect(screen.getByTestId("manage-tag-row-t1")).toBeInTheDocument();
    });

    it("closes edit form when delete is requested on same tag", async () => {
      const { user } = renderDialog();

      await user.click(screen.getByTestId("trigger"));
      // Start editing t1
      await user.click(screen.getByTestId("manage-tag-edit-t1"));
      expect(screen.getByTestId("tag-edit-form-t1")).toBeInTheDocument();

      // Cancel edit first, then delete
      await user.click(screen.getByTestId("tag-edit-cancel-t1"));
      await user.click(screen.getByTestId("manage-tag-delete-t1"));
      expect(screen.queryByTestId("tag-edit-form-t1")).not.toBeInTheDocument();
      expect(screen.getByTestId("tag-delete-confirm-t1")).toBeInTheDocument();
    });
  });
});
