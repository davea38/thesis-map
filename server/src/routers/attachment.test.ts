import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { appRouter } from "../router.js";

// Mock the db module
vi.mock("../db.js", () => {
  const mockDb = {
    $transaction: vi.fn(),
    map: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
    },
    node: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tag: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    nodeTag: {
      create: vi.fn(),
      delete: vi.fn(),
    },
    attachment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  };
  return { db: mockDb };
});

import { db } from "../db.js";
const mockDb = db as unknown as {
  $transaction: Mock;
  map: { findMany: Mock; findUnique: Mock; update: Mock; delete: Mock; create: Mock };
  node: { create: Mock; findUnique: Mock; findMany: Mock; update: Mock; delete: Mock };
  tag: { create: Mock; findUnique: Mock; findMany: Mock; update: Mock; delete: Mock };
  nodeTag: { create: Mock; delete: Mock };
  attachment: {
    create: Mock;
    findUnique: Mock;
    findMany: Mock;
    update: Mock;
    delete: Mock;
    count: Mock;
  };
};

// Mock global fetch for preview fetching tests
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("attachment router", () => {
  const caller = appRouter.createCaller({});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("attachment.create", () => {
    it("creates a source attachment with valid URL", async () => {
      const mockAttachment = {
        id: "att-1",
        nodeId: "node-1",
        type: "source",
        url: "https://example.com",
        sourceType: "url",
        noteText: null,
        previewFetchStatus: "pending",
        orderIndex: 0,
        createdAt: new Date(),
      };

      mockDb.node.findUnique.mockResolvedValue({ id: "node-1", mapId: "map-1" } as any);
      mockDb.attachment.count.mockResolvedValue(0);
      mockDb.attachment.create.mockResolvedValue(mockAttachment as any);
      mockDb.map.update.mockResolvedValue({} as any);
      // Mock for async preview fetch
      mockDb.attachment.findUnique.mockResolvedValue(null);

      const result = await caller.attachment.create({
        nodeId: "node-1",
        type: "source",
        url: "https://example.com",
      });

      expect(result.id).toBe("att-1");
      expect(result.type).toBe("source");
      expect(result.url).toBe("https://example.com");
      expect(result.previewFetchStatus).toBe("pending");
      expect(mockDb.attachment.create).toHaveBeenCalledWith({
        data: {
          nodeId: "node-1",
          type: "source",
          url: "https://example.com",
          sourceType: "url",
          noteText: null,
          previewFetchStatus: "pending",
          orderIndex: 0,
        },
      });
    });

    it("auto-prepends https:// to URLs without protocol", async () => {
      const mockAttachment = {
        id: "att-1",
        nodeId: "node-1",
        type: "source",
        url: "https://example.com",
        sourceType: "url",
        noteText: null,
        previewFetchStatus: "pending",
        orderIndex: 0,
        createdAt: new Date(),
      };

      mockDb.node.findUnique.mockResolvedValue({ id: "node-1", mapId: "map-1" } as any);
      mockDb.attachment.count.mockResolvedValue(0);
      mockDb.attachment.create.mockResolvedValue(mockAttachment as any);
      mockDb.map.update.mockResolvedValue({} as any);
      mockDb.attachment.findUnique.mockResolvedValue(null);

      await caller.attachment.create({
        nodeId: "node-1",
        type: "source",
        url: "example.com",
      });

      expect(mockDb.attachment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ url: "https://example.com" }),
        })
      );
    });

    it("assigns orderIndex based on existing attachment count", async () => {
      mockDb.node.findUnique.mockResolvedValue({ id: "node-1", mapId: "map-1" } as any);
      mockDb.attachment.count.mockResolvedValue(3);
      mockDb.attachment.create.mockResolvedValue({
        id: "att-4",
        nodeId: "node-1",
        type: "source",
        url: "https://example.com",
        orderIndex: 3,
        previewFetchStatus: "pending",
        createdAt: new Date(),
      } as any);
      mockDb.map.update.mockResolvedValue({} as any);
      mockDb.attachment.findUnique.mockResolvedValue(null);

      await caller.attachment.create({
        nodeId: "node-1",
        type: "source",
        url: "https://example.com",
      });

      expect(mockDb.attachment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ orderIndex: 3 }),
        })
      );
    });

    it("creates a note attachment with valid text", async () => {
      const mockAttachment = {
        id: "att-1",
        nodeId: "node-1",
        type: "note",
        noteText: "This is a note",
        previewFetchStatus: null,
        orderIndex: 0,
        createdAt: new Date(),
      };

      mockDb.node.findUnique.mockResolvedValue({ id: "node-1", mapId: "map-1" } as any);
      mockDb.attachment.count.mockResolvedValue(0);
      mockDb.attachment.create.mockResolvedValue(mockAttachment as any);
      mockDb.map.update.mockResolvedValue({} as any);

      const result = await caller.attachment.create({
        nodeId: "node-1",
        type: "note",
        noteText: "This is a note",
      });

      expect(result.type).toBe("note");
      expect(result.noteText).toBe("This is a note");
      expect(result.previewFetchStatus).toBeNull();
    });

    it("throws when node not found", async () => {
      mockDb.node.findUnique.mockResolvedValue(null);

      await expect(
        caller.attachment.create({
          nodeId: "nonexistent",
          type: "source",
          url: "https://example.com",
        })
      ).rejects.toThrow("Node not found");
    });

    it("throws when source URL is empty", async () => {
      mockDb.node.findUnique.mockResolvedValue({ id: "node-1", mapId: "map-1" } as any);

      await expect(
        caller.attachment.create({
          nodeId: "node-1",
          type: "source",
          url: "",
        })
      ).rejects.toThrow("URL is required for source attachments");
    });

    it("throws when source URL is missing", async () => {
      mockDb.node.findUnique.mockResolvedValue({ id: "node-1", mapId: "map-1" } as any);

      await expect(
        caller.attachment.create({
          nodeId: "node-1",
          type: "source",
        })
      ).rejects.toThrow("URL is required for source attachments");
    });

    it("throws when source URL is invalid", async () => {
      mockDb.node.findUnique.mockResolvedValue({ id: "node-1", mapId: "map-1" } as any);

      await expect(
        caller.attachment.create({
          nodeId: "node-1",
          type: "source",
          url: "not a valid url at all !!!",
        })
      ).rejects.toThrow("Invalid URL");
    });

    it("throws when note text is empty", async () => {
      mockDb.node.findUnique.mockResolvedValue({ id: "node-1", mapId: "map-1" } as any);

      await expect(
        caller.attachment.create({
          nodeId: "node-1",
          type: "note",
          noteText: "",
        })
      ).rejects.toThrow("Note text is required for note attachments");
    });

    it("throws when note text is missing", async () => {
      mockDb.node.findUnique.mockResolvedValue({ id: "node-1", mapId: "map-1" } as any);

      await expect(
        caller.attachment.create({
          nodeId: "node-1",
          type: "note",
        })
      ).rejects.toThrow("Note text is required for note attachments");
    });

    it("rejects invalid attachment type", async () => {
      await expect(
        caller.attachment.create({
          nodeId: "node-1",
          type: "invalid" as any,
          url: "https://example.com",
        })
      ).rejects.toThrow();
    });

    it("bumps map updatedAt after creation", async () => {
      mockDb.node.findUnique.mockResolvedValue({ id: "node-1", mapId: "map-1" } as any);
      mockDb.attachment.count.mockResolvedValue(0);
      mockDb.attachment.create.mockResolvedValue({
        id: "att-1",
        nodeId: "node-1",
        type: "note",
        noteText: "Test",
        previewFetchStatus: null,
        orderIndex: 0,
        createdAt: new Date(),
      } as any);
      mockDb.map.update.mockResolvedValue({} as any);

      await caller.attachment.create({
        nodeId: "node-1",
        type: "note",
        noteText: "Test",
      });

      expect(mockDb.map.update).toHaveBeenCalledWith({
        where: { id: "map-1" },
        data: { updatedAt: expect.any(Date) },
      });
    });

    it("creates source with optional noteText", async () => {
      mockDb.node.findUnique.mockResolvedValue({ id: "node-1", mapId: "map-1" } as any);
      mockDb.attachment.count.mockResolvedValue(0);
      mockDb.attachment.create.mockResolvedValue({
        id: "att-1",
        nodeId: "node-1",
        type: "source",
        url: "https://example.com",
        noteText: "My note about this source",
        previewFetchStatus: "pending",
        orderIndex: 0,
        createdAt: new Date(),
      } as any);
      mockDb.map.update.mockResolvedValue({} as any);
      mockDb.attachment.findUnique.mockResolvedValue(null);

      await caller.attachment.create({
        nodeId: "node-1",
        type: "source",
        url: "https://example.com",
        noteText: "My note about this source",
      });

      expect(mockDb.attachment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            noteText: "My note about this source",
          }),
        })
      );
    });
  });

  describe("attachment.update", () => {
    it("updates note text on a source attachment", async () => {
      mockDb.attachment.findUnique.mockResolvedValue({
        id: "att-1",
        type: "source",
        url: "https://example.com",
        noteText: null,
        node: { mapId: "map-1" },
      } as any);
      mockDb.attachment.update.mockResolvedValue({
        id: "att-1",
        type: "source",
        url: "https://example.com",
        noteText: "Updated note",
      } as any);
      mockDb.map.update.mockResolvedValue({} as any);

      const result = await caller.attachment.update({
        id: "att-1",
        noteText: "Updated note",
      });

      expect(result.noteText).toBe("Updated note");
      expect(mockDb.attachment.update).toHaveBeenCalledWith({
        where: { id: "att-1" },
        data: { noteText: "Updated note" },
      });
    });

    it("clears preview fields when URL changes on source", async () => {
      mockDb.attachment.findUnique.mockResolvedValueOnce({
        id: "att-1",
        type: "source",
        url: "https://old.com",
        previewTitle: "Old Title",
        previewDescription: "Old Description",
        node: { mapId: "map-1" },
      } as any);
      mockDb.attachment.update.mockResolvedValue({
        id: "att-1",
        type: "source",
        url: "https://new.com",
        previewTitle: null,
        previewDescription: null,
        previewFetchStatus: "pending",
      } as any);
      mockDb.map.update.mockResolvedValue({} as any);
      // Mock for async fetch
      mockDb.attachment.findUnique.mockResolvedValue(null);

      await caller.attachment.update({
        id: "att-1",
        url: "https://new.com",
      });

      expect(mockDb.attachment.update).toHaveBeenCalledWith({
        where: { id: "att-1" },
        data: {
          url: "https://new.com",
          previewTitle: null,
          previewDescription: null,
          previewImageUrl: null,
          previewFaviconUrl: null,
          previewSiteName: null,
          previewFetchStatus: "pending",
          previewFetchedAt: null,
          previewFetchError: null,
        },
      });
    });

    it("does not clear preview fields when URL is unchanged", async () => {
      mockDb.attachment.findUnique.mockResolvedValue({
        id: "att-1",
        type: "source",
        url: "https://example.com",
        previewTitle: "Existing Title",
        node: { mapId: "map-1" },
      } as any);
      mockDb.attachment.update.mockResolvedValue({
        id: "att-1",
        type: "source",
        url: "https://example.com",
        previewTitle: "Existing Title",
      } as any);
      mockDb.map.update.mockResolvedValue({} as any);

      await caller.attachment.update({
        id: "att-1",
        url: "https://example.com",
      });

      // Should not include preview-clearing fields
      expect(mockDb.attachment.update).toHaveBeenCalledWith({
        where: { id: "att-1" },
        data: {},
      });
    });

    it("updates note text on a note attachment", async () => {
      mockDb.attachment.findUnique.mockResolvedValue({
        id: "att-1",
        type: "note",
        noteText: "Old note",
        node: { mapId: "map-1" },
      } as any);
      mockDb.attachment.update.mockResolvedValue({
        id: "att-1",
        type: "note",
        noteText: "New note",
      } as any);
      mockDb.map.update.mockResolvedValue({} as any);

      const result = await caller.attachment.update({
        id: "att-1",
        noteText: "New note",
      });

      expect(result.noteText).toBe("New note");
    });

    it("throws when attachment not found", async () => {
      mockDb.attachment.findUnique.mockResolvedValue(null);

      await expect(
        caller.attachment.update({ id: "nonexistent", noteText: "test" })
      ).rejects.toThrow("Attachment not found");
    });

    it("throws when source URL is empty on update", async () => {
      mockDb.attachment.findUnique.mockResolvedValue({
        id: "att-1",
        type: "source",
        url: "https://example.com",
        node: { mapId: "map-1" },
      } as any);

      await expect(
        caller.attachment.update({ id: "att-1", url: "" })
      ).rejects.toThrow("URL cannot be empty for source attachments");
    });

    it("throws when note text is empty on note update", async () => {
      mockDb.attachment.findUnique.mockResolvedValue({
        id: "att-1",
        type: "note",
        noteText: "Old note",
        node: { mapId: "map-1" },
      } as any);

      await expect(
        caller.attachment.update({ id: "att-1", noteText: "   " })
      ).rejects.toThrow("Note text cannot be empty for note attachments");
    });

    it("bumps map updatedAt after update", async () => {
      mockDb.attachment.findUnique.mockResolvedValue({
        id: "att-1",
        type: "note",
        noteText: "Old note",
        node: { mapId: "map-1" },
      } as any);
      mockDb.attachment.update.mockResolvedValue({
        id: "att-1",
        type: "note",
        noteText: "New note",
      } as any);
      mockDb.map.update.mockResolvedValue({} as any);

      await caller.attachment.update({ id: "att-1", noteText: "New note" });

      expect(mockDb.map.update).toHaveBeenCalledWith({
        where: { id: "map-1" },
        data: { updatedAt: expect.any(Date) },
      });
    });
  });

  describe("attachment.delete", () => {
    it("deletes an attachment and returns its data for undo", async () => {
      const mockAttachment = {
        id: "att-1",
        nodeId: "node-1",
        type: "source",
        url: "https://example.com",
        sourceType: "url",
        noteText: null,
        previewTitle: "Example",
        previewDescription: "An example site",
        previewImageUrl: null,
        previewFaviconUrl: "https://example.com/favicon.ico",
        previewSiteName: "example.com",
        previewFetchStatus: "success",
        previewFetchedAt: new Date(),
        previewFetchError: null,
        orderIndex: 0,
        createdAt: new Date(),
        node: { mapId: "map-1" },
      };

      mockDb.attachment.findUnique.mockResolvedValue(mockAttachment as any);
      mockDb.attachment.delete.mockResolvedValue({} as any);
      mockDb.map.update.mockResolvedValue({} as any);

      const result = await caller.attachment.delete({ id: "att-1" });

      expect(result.id).toBe("att-1");
      expect(result.url).toBe("https://example.com");
      expect(result.previewTitle).toBe("Example");
      // Should not include the nested node relation
      expect((result as any).node).toBeUndefined();

      expect(mockDb.attachment.delete).toHaveBeenCalledWith({
        where: { id: "att-1" },
      });
    });

    it("throws when attachment not found", async () => {
      mockDb.attachment.findUnique.mockResolvedValue(null);

      await expect(
        caller.attachment.delete({ id: "nonexistent" })
      ).rejects.toThrow("Attachment not found");
    });

    it("bumps map updatedAt after deletion", async () => {
      mockDb.attachment.findUnique.mockResolvedValue({
        id: "att-1",
        nodeId: "node-1",
        type: "note",
        noteText: "Test",
        orderIndex: 0,
        createdAt: new Date(),
        node: { mapId: "map-1" },
      } as any);
      mockDb.attachment.delete.mockResolvedValue({} as any);
      mockDb.map.update.mockResolvedValue({} as any);

      await caller.attachment.delete({ id: "att-1" });

      expect(mockDb.map.update).toHaveBeenCalledWith({
        where: { id: "map-1" },
        data: { updatedAt: expect.any(Date) },
      });
    });
  });

  describe("attachment.listByNode", () => {
    it("returns attachments ordered by createdAt ascending", async () => {
      const mockAttachments = [
        { id: "att-1", nodeId: "node-1", type: "source", createdAt: new Date("2024-01-01") },
        { id: "att-2", nodeId: "node-1", type: "note", createdAt: new Date("2024-01-02") },
        { id: "att-3", nodeId: "node-1", type: "source", createdAt: new Date("2024-01-03") },
      ];

      mockDb.attachment.findMany.mockResolvedValue(mockAttachments as any);

      const result = await caller.attachment.listByNode({ nodeId: "node-1" });

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("att-1");
      expect(result[2].id).toBe("att-3");

      expect(mockDb.attachment.findMany).toHaveBeenCalledWith({
        where: { nodeId: "node-1" },
        orderBy: { createdAt: "asc" },
      });
    });

    it("returns empty array for node with no attachments", async () => {
      mockDb.attachment.findMany.mockResolvedValue([]);

      const result = await caller.attachment.listByNode({ nodeId: "node-1" });

      expect(result).toHaveLength(0);
    });
  });

  describe("attachment.refreshPreview", () => {
    it("throws when attachment not found", async () => {
      mockDb.attachment.findUnique.mockResolvedValue(null);

      await expect(
        caller.attachment.refreshPreview({ id: "nonexistent" })
      ).rejects.toThrow("Attachment not found");
    });

    it("throws when attachment is not a source", async () => {
      mockDb.attachment.findUnique.mockResolvedValue({
        id: "att-1",
        type: "note",
        noteText: "Test",
        node: { mapId: "map-1" },
      } as any);

      await expect(
        caller.attachment.refreshPreview({ id: "att-1" })
      ).rejects.toThrow("Only source attachments have preview metadata");
    });

    it("throws when source has no URL", async () => {
      mockDb.attachment.findUnique.mockResolvedValue({
        id: "att-1",
        type: "source",
        url: null,
        node: { mapId: "map-1" },
      } as any);

      await expect(
        caller.attachment.refreshPreview({ id: "att-1" })
      ).rejects.toThrow("Attachment has no URL");
    });

    it("fetches preview and updates attachment on success", async () => {
      const htmlContent = `
        <html>
          <head>
            <meta property="og:title" content="Test Title" />
            <meta property="og:description" content="Test Description" />
            <meta property="og:image" content="https://example.com/image.jpg" />
            <meta property="og:site_name" content="Example Site" />
            <link rel="icon" href="/favicon.ico" />
          </head>
          <body></body>
        </html>
      `;

      mockDb.attachment.findUnique
        .mockResolvedValueOnce({
          id: "att-1",
          type: "source",
          url: "https://example.com/article",
          node: { mapId: "map-1" },
        } as any);

      // Set pending status
      mockDb.attachment.update.mockResolvedValueOnce({} as any);

      // Mock fetch
      mockFetch.mockResolvedValue({
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
        body: {
          getReader: () => {
            let done = false;
            return {
              read: () => {
                if (done) return Promise.resolve({ done: true, value: undefined });
                done = true;
                return Promise.resolve({
                  done: false,
                  value: new TextEncoder().encode(htmlContent),
                });
              },
              cancel: () => Promise.resolve(),
            };
          },
        },
      } as any);

      // URL check before write
      mockDb.attachment.findUnique.mockResolvedValueOnce({
        url: "https://example.com/article",
      } as any);

      // Update with metadata
      const updatedAttachment = {
        id: "att-1",
        type: "source",
        url: "https://example.com/article",
        previewTitle: "Test Title",
        previewDescription: "Test Description",
        previewImageUrl: "https://example.com/image.jpg",
        previewFaviconUrl: "https://example.com/favicon.ico",
        previewSiteName: "Example Site",
        previewFetchStatus: "success",
        previewFetchedAt: new Date(),
        previewFetchError: null,
      };
      mockDb.attachment.update.mockResolvedValueOnce(updatedAttachment as any);
      mockDb.map.update.mockResolvedValue({} as any);

      const result = await caller.attachment.refreshPreview({ id: "att-1" });

      expect(result!.previewTitle).toBe("Test Title");
      expect(result!.previewFetchStatus).toBe("success");
    });

    it("marks as failed on fetch error", async () => {
      mockDb.attachment.findUnique
        .mockResolvedValueOnce({
          id: "att-1",
          type: "source",
          url: "https://unreachable.example.com",
          node: { mapId: "map-1" },
        } as any);

      // Set pending status
      mockDb.attachment.update.mockResolvedValueOnce({} as any);

      // Mock fetch failure
      mockFetch.mockRejectedValue(new Error("DNS resolution failed"));

      // URL check before writing error
      mockDb.attachment.findUnique.mockResolvedValueOnce({
        url: "https://unreachable.example.com",
      } as any);

      // Update with error
      const failedAttachment = {
        id: "att-1",
        type: "source",
        url: "https://unreachable.example.com",
        previewFetchStatus: "failed",
        previewFetchError: "Fetch failed: DNS resolution failed",
      };
      mockDb.attachment.update.mockResolvedValueOnce(failedAttachment as any);
      mockDb.map.update.mockResolvedValue({} as any);

      const result = await caller.attachment.refreshPreview({ id: "att-1" });

      expect(result!.previewFetchStatus).toBe("failed");
      expect(result!.previewFetchError).toContain("DNS resolution failed");
    });

    it("discards result when URL changed during fetch", async () => {
      mockDb.attachment.findUnique
        .mockResolvedValueOnce({
          id: "att-1",
          type: "source",
          url: "https://original.com",
          node: { mapId: "map-1" },
        } as any);

      // Set pending status
      mockDb.attachment.update.mockResolvedValueOnce({} as any);

      // Mock successful fetch
      const htmlContent = `<html><head><title>Original</title></head><body></body></html>`;
      mockFetch.mockResolvedValue({
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "text/html" }),
        body: {
          getReader: () => {
            let done = false;
            return {
              read: () => {
                if (done) return Promise.resolve({ done: true, value: undefined });
                done = true;
                return Promise.resolve({
                  done: false,
                  value: new TextEncoder().encode(htmlContent),
                });
              },
              cancel: () => Promise.resolve(),
            };
          },
        },
      } as any);

      // URL changed during fetch — return different URL
      mockDb.attachment.findUnique.mockResolvedValueOnce({
        url: "https://different.com",
      } as any);

      // Should read current state instead
      const currentAttachment = {
        id: "att-1",
        type: "source",
        url: "https://different.com",
        previewFetchStatus: "pending",
      };
      mockDb.attachment.findUnique.mockResolvedValueOnce(currentAttachment as any);

      const result = await caller.attachment.refreshPreview({ id: "att-1" });

      // Should return the current state without updating preview fields
      expect(result!.url).toBe("https://different.com");
      // The update call should only be the initial "pending" set, not the metadata write
      expect(mockDb.attachment.update).toHaveBeenCalledTimes(1);
    });

    it("handles HTTP error responses", async () => {
      mockDb.attachment.findUnique
        .mockResolvedValueOnce({
          id: "att-1",
          type: "source",
          url: "https://example.com/404",
          node: { mapId: "map-1" },
        } as any);

      // Set pending
      mockDb.attachment.update.mockResolvedValueOnce({} as any);

      // Mock 404 response
      mockFetch.mockResolvedValue({
        status: 404,
        statusText: "Not Found",
        headers: new Headers({}),
      } as any);

      // URL check
      mockDb.attachment.findUnique.mockResolvedValueOnce({
        url: "https://example.com/404",
      } as any);

      // Update with error
      mockDb.attachment.update.mockResolvedValueOnce({
        id: "att-1",
        previewFetchStatus: "failed",
        previewFetchError: "HTTP 404 Not Found",
      } as any);
      mockDb.map.update.mockResolvedValue({} as any);

      const result = await caller.attachment.refreshPreview({ id: "att-1" });

      expect(result!.previewFetchStatus).toBe("failed");
      expect(result!.previewFetchError).toContain("404");
    });

    it("handles non-HTML content as success with empty preview", async () => {
      mockDb.attachment.findUnique
        .mockResolvedValueOnce({
          id: "att-1",
          type: "source",
          url: "https://example.com/file.pdf",
          node: { mapId: "map-1" },
        } as any);

      // Set pending
      mockDb.attachment.update.mockResolvedValueOnce({} as any);

      // Mock PDF response
      mockFetch.mockResolvedValue({
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "application/pdf" }),
      } as any);

      // URL check
      mockDb.attachment.findUnique.mockResolvedValueOnce({
        url: "https://example.com/file.pdf",
      } as any);

      // Update with empty preview
      mockDb.attachment.update.mockResolvedValueOnce({
        id: "att-1",
        previewTitle: null,
        previewDescription: null,
        previewFetchStatus: "success",
        previewSiteName: "example.com",
      } as any);
      mockDb.map.update.mockResolvedValue({} as any);

      const result = await caller.attachment.refreshPreview({ id: "att-1" });

      expect(result!.previewFetchStatus).toBe("success");
      expect(result!.previewTitle).toBeNull();
    });
  });
});

// Tests for the exported utility functions
describe("attachment utilities", () => {
  // We need to import these after the mock setup
  let normalizeUrl: (raw: string) => string;
  let truncate: (str: string | null | undefined, max: number) => string | null;
  let parseMetaTags: (html: string, finalUrl: string) => any;

  beforeEach(async () => {
    const mod = await import("./attachment.js");
    normalizeUrl = mod.normalizeUrl;
    truncate = mod.truncate;
    parseMetaTags = mod.parseMetaTags;
  });

  describe("normalizeUrl", () => {
    it("returns URL as-is if it already has https://", () => {
      expect(normalizeUrl("https://example.com")).toBe("https://example.com");
    });

    it("returns URL as-is if it has http://", () => {
      expect(normalizeUrl("http://example.com")).toBe("http://example.com");
    });

    it("prepends https:// to bare domains", () => {
      expect(normalizeUrl("example.com")).toBe("https://example.com");
    });

    it("prepends https:// to domains with paths", () => {
      expect(normalizeUrl("example.com/path")).toBe(
        "https://example.com/path"
      );
    });

    it("trims whitespace", () => {
      expect(normalizeUrl("  https://example.com  ")).toBe(
        "https://example.com"
      );
    });

    it("returns empty string for empty input", () => {
      expect(normalizeUrl("")).toBe("");
    });

    it("throws on invalid URLs", () => {
      expect(() => normalizeUrl("not a url at all !!!")).toThrow();
    });
  });

  describe("truncate", () => {
    it("returns null for null input", () => {
      expect(truncate(null, 100)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(truncate(undefined, 100)).toBeNull();
    });

    it("returns string unchanged if under limit", () => {
      expect(truncate("short", 100)).toBe("short");
    });

    it("truncates string at limit", () => {
      expect(truncate("hello world", 5)).toBe("hello");
    });
  });

  describe("parseMetaTags", () => {
    it("extracts OG meta tags", () => {
      const html = `
        <html><head>
          <meta property="og:title" content="OG Title" />
          <meta property="og:description" content="OG Description" />
          <meta property="og:image" content="https://example.com/img.jpg" />
          <meta property="og:site_name" content="Example" />
        </head><body></body></html>
      `;

      const result = parseMetaTags(html, "https://example.com");
      expect(result.title).toBe("OG Title");
      expect(result.description).toBe("OG Description");
      expect(result.image).toBe("https://example.com/img.jpg");
      expect(result.siteName).toBe("Example");
    });

    it("falls back to twitter tags when OG not present", () => {
      const html = `
        <html><head>
          <meta name="twitter:title" content="Twitter Title" />
          <meta name="twitter:description" content="Twitter Desc" />
          <meta name="twitter:image" content="https://example.com/tw.jpg" />
        </head><body></body></html>
      `;

      const result = parseMetaTags(html, "https://example.com");
      expect(result.title).toBe("Twitter Title");
      expect(result.description).toBe("Twitter Desc");
      expect(result.image).toBe("https://example.com/tw.jpg");
    });

    it("falls back to <title> tag", () => {
      const html = `
        <html><head><title>Page Title</title></head><body></body></html>
      `;

      const result = parseMetaTags(html, "https://example.com");
      expect(result.title).toBe("Page Title");
    });

    it("falls back to meta description", () => {
      const html = `
        <html><head>
          <meta name="description" content="Meta description" />
        </head><body></body></html>
      `;

      const result = parseMetaTags(html, "https://example.com");
      expect(result.description).toBe("Meta description");
    });

    it("extracts and resolves favicon", () => {
      const html = `
        <html><head>
          <link rel="icon" href="/icon.png" />
        </head><body></body></html>
      `;

      const result = parseMetaTags(html, "https://example.com/page");
      expect(result.favicon).toBe("https://example.com/icon.png");
    });

    it("defaults to /favicon.ico when no link rel=icon", () => {
      const html = `<html><head></head><body></body></html>`;

      const result = parseMetaTags(html, "https://example.com/page");
      expect(result.favicon).toBe("https://example.com/favicon.ico");
    });

    it("falls back to domain for site name", () => {
      const html = `<html><head></head><body></body></html>`;

      const result = parseMetaTags(html, "https://example.com");
      expect(result.siteName).toBe("example.com");
    });

    it("resolves relative image URLs", () => {
      const html = `
        <html><head>
          <meta property="og:image" content="/images/cover.jpg" />
        </head><body></body></html>
      `;

      const result = parseMetaTags(html, "https://example.com/page");
      expect(result.image).toBe("https://example.com/images/cover.jpg");
    });

    it("truncates long titles", () => {
      const longTitle = "A".repeat(600);
      const html = `<html><head><meta property="og:title" content="${longTitle}" /></head><body></body></html>`;

      const result = parseMetaTags(html, "https://example.com");
      expect(result.title!.length).toBe(500);
    });

    it("truncates long descriptions", () => {
      const longDesc = "B".repeat(1200);
      const html = `<html><head><meta property="og:description" content="${longDesc}" /></head><body></body></html>`;

      const result = parseMetaTags(html, "https://example.com");
      expect(result.description!.length).toBe(1000);
    });

    it("truncates long site names", () => {
      const longName = "C".repeat(300);
      const html = `<html><head><meta property="og:site_name" content="${longName}" /></head><body></body></html>`;

      const result = parseMetaTags(html, "https://example.com");
      expect(result.siteName!.length).toBe(200);
    });

    it("handles meta tags with content before property", () => {
      const html = `
        <html><head>
          <meta content="Reversed Title" property="og:title" />
        </head><body></body></html>
      `;

      const result = parseMetaTags(html, "https://example.com");
      expect(result.title).toBe("Reversed Title");
    });
  });
});
